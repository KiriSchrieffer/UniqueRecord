using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

namespace UniqueRecord.CaptureHost;

internal sealed class GdiMjpegCaptureEngine : ICaptureEngine
{
    private readonly object _sync = new();
    private CancellationTokenSource? _captureCts;
    private Task? _captureTask;
    private MjpegAviWriter? _aviWriter;
    private Exception? _captureError;

    public Task StartAsync(CaptureHostOptions options, CancellationToken cancellationToken)
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException("GDI capture is supported on Windows only.");
        }

        var container = options.Container.Trim().TrimStart('.').ToLowerInvariant();
        if (container != "avi")
        {
            throw new InvalidOperationException(
                $"unsupported_container: {options.Container}. Current host supports AVI only."
            );
        }

        var config = CaptureConfig.FromOptions(options);
        var outputPath = Path.GetFullPath(options.OutputPath);
        var outputDir = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrWhiteSpace(outputDir))
        {
            Directory.CreateDirectory(outputDir);
        }

        lock (_sync)
        {
            if (_captureTask is not null)
            {
                throw new InvalidOperationException("capture session already running");
            }

            _captureError = null;
            _aviWriter = new MjpegAviWriter(
                outputPath: outputPath,
                width: config.OutputWidth,
                height: config.OutputHeight,
                fps: config.Fps
            );
            _captureCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            _captureTask = Task.Run(
                () => CaptureLoopAsync(config, _aviWriter, _captureCts.Token),
                CancellationToken.None
            );
        }

        return Task.CompletedTask;
    }

    public async Task StopAsync(CaptureHostOptions options, CancellationToken cancellationToken)
    {
        _ = options;
        Task? captureTask;
        CancellationTokenSource? captureCts;
        MjpegAviWriter? aviWriter;

        lock (_sync)
        {
            captureTask = _captureTask;
            captureCts = _captureCts;
            aviWriter = _aviWriter;
            _captureTask = null;
            _captureCts = null;
            _aviWriter = null;
        }

        if (captureCts is not null)
        {
            try
            {
                captureCts.Cancel();
            }
            catch
            {
                // Best-effort cancellation.
            }
        }

        if (captureTask is not null)
        {
            try
            {
                await captureTask.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
            }
            catch (OperationCanceledException)
            {
                // Controlled shutdown by caller cancellation.
            }
            catch (TimeoutException)
            {
                throw new TimeoutException("capture loop stop timeout");
            }
        }

        if (aviWriter is not null)
        {
            await aviWriter.DisposeAsync();
        }

        captureCts?.Dispose();

        lock (_sync)
        {
            if (_captureError is not null)
            {
                throw new InvalidOperationException("capture_loop_failed", _captureError);
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        await StopAsync(
            new CaptureHostOptions(
                OutputPath: string.Empty,
                StopSignalPath: string.Empty,
                SessionId: string.Empty,
                Container: "avi",
                StartTsMs: 0,
                Fps: null,
                Width: null,
                Height: null,
                VideoBitrateKbps: null,
                AudioBitrateKbps: null,
                Encoder: null,
                AudioCodec: null,
                HardwareEncodingEnabled: null,
                AudioInputDevice: null,
                AudioInputEnabled: null,
                AudioOutputEnabled: null,
                WindowTitle: null,
                WindowClass: null,
                DisplayId: null
            ),
            CancellationToken.None
        );
    }

    private async Task CaptureLoopAsync(
        CaptureConfig config,
        MjpegAviWriter writer,
        CancellationToken cancellationToken
    )
    {
        try
        {
            using var captureBitmap = new Bitmap(
                config.CaptureWidth,
                config.CaptureHeight,
                PixelFormat.Format24bppRgb
            );
            using var captureGraphics = Graphics.FromImage(captureBitmap);
            captureGraphics.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
            captureGraphics.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighSpeed;
            captureGraphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.None;
            captureGraphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
            captureGraphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;

            Bitmap? outputBitmap = null;
            Graphics? outputGraphics = null;
            if (config.OutputWidth != config.CaptureWidth || config.OutputHeight != config.CaptureHeight)
            {
                outputBitmap = new Bitmap(config.OutputWidth, config.OutputHeight, PixelFormat.Format24bppRgb);
                outputGraphics = Graphics.FromImage(outputBitmap);
                outputGraphics.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
                outputGraphics.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighSpeed;
                outputGraphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighSpeed;
                outputGraphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.Bilinear;
                outputGraphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
            }

            try
            {
                var jpegCodec = ResolveJpegCodec();
                using var encoderParams = new EncoderParameters(1);
                encoderParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 82L);

                var frameIntervalTicks = Math.Max(1L, Stopwatch.Frequency / Math.Max(1, config.Fps));
                var nextFrameAt = Stopwatch.GetTimestamp();

                while (!cancellationToken.IsCancellationRequested)
                {
                    captureGraphics.CopyFromScreen(
                        sourceX: config.CaptureLeft,
                        sourceY: config.CaptureTop,
                        destinationX: 0,
                        destinationY: 0,
                        blockRegionSize: new Size(config.CaptureWidth, config.CaptureHeight),
                        copyPixelOperation: CopyPixelOperation.SourceCopy
                    );

                    var frameBitmap = captureBitmap;
                    if (outputBitmap is not null && outputGraphics is not null)
                    {
                        outputGraphics.DrawImage(
                            captureBitmap,
                            destRect: new Rectangle(0, 0, config.OutputWidth, config.OutputHeight),
                            srcRect: new Rectangle(0, 0, config.CaptureWidth, config.CaptureHeight),
                            srcUnit: GraphicsUnit.Pixel
                        );
                        frameBitmap = outputBitmap;
                    }

                    using var buffer = new MemoryStream(1024 * 1024);
                    if (jpegCodec is null)
                    {
                        frameBitmap.Save(buffer, ImageFormat.Jpeg);
                    }
                    else
                    {
                        frameBitmap.Save(buffer, jpegCodec, encoderParams);
                    }
                    writer.WriteFrame(buffer.ToArray());

                    nextFrameAt += frameIntervalTicks;
                    var waitTicks = nextFrameAt - Stopwatch.GetTimestamp();
                    if (waitTicks <= 0)
                    {
                        continue;
                    }
                    var waitMs = (int)(waitTicks * 1000 / Stopwatch.Frequency);
                    if (waitMs > 0)
                    {
                        await Task.Delay(waitMs, cancellationToken);
                    }
                }
            }
            finally
            {
                outputGraphics?.Dispose();
                outputBitmap?.Dispose();
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Expected during normal shutdown.
        }
        catch (Exception ex)
        {
            lock (_sync)
            {
                _captureError = ex;
            }
        }
    }

    private static ImageCodecInfo? ResolveJpegCodec()
    {
        return ImageCodecInfo.GetImageEncoders()
            .FirstOrDefault(encoder => string.Equals(encoder.MimeType, "image/jpeg", StringComparison.OrdinalIgnoreCase));
    }

    private sealed record CaptureConfig(
        int CaptureLeft,
        int CaptureTop,
        int CaptureWidth,
        int CaptureHeight,
        int OutputWidth,
        int OutputHeight,
        int Fps
    )
    {
        public static CaptureConfig FromOptions(CaptureHostOptions options)
        {
            var captureLeft = GetSystemMetrics(76);   // SM_XVIRTUALSCREEN
            var captureTop = GetSystemMetrics(77);    // SM_YVIRTUALSCREEN
            var captureWidth = GetSystemMetrics(78);  // SM_CXVIRTUALSCREEN
            var captureHeight = GetSystemMetrics(79); // SM_CYVIRTUALSCREEN

            if (captureWidth <= 0 || captureHeight <= 0)
            {
                captureLeft = 0;
                captureTop = 0;
                captureWidth = 1920;
                captureHeight = 1080;
            }

            var outputWidth = options.Width.GetValueOrDefault(captureWidth);
            var outputHeight = options.Height.GetValueOrDefault(captureHeight);
            outputWidth = Math.Clamp(outputWidth, 320, 7680);
            outputHeight = Math.Clamp(outputHeight, 240, 4320);

            var fps = options.Fps.GetValueOrDefault(30);
            fps = Math.Clamp(fps, 5, 120);

            return new CaptureConfig(
                CaptureLeft: captureLeft,
                CaptureTop: captureTop,
                CaptureWidth: captureWidth,
                CaptureHeight: captureHeight,
                OutputWidth: outputWidth,
                OutputHeight: outputHeight,
                Fps: fps
            );
        }
    }

    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int nIndex);
}

internal sealed class MjpegAviWriter : IAsyncDisposable
{
    private readonly FileStream _stream;
    private readonly BinaryWriter _writer;
    private readonly int _width;
    private readonly int _height;
    private readonly int _fps;
    private readonly List<AviIndexEntry> _indexEntries = [];
    private readonly long _riffSizePosition;
    private readonly long _avihTotalFramesPosition;
    private readonly long _strhLengthPosition;
    private readonly long _moviListSizePosition;
    private readonly long _moviListDataStartPosition;
    private readonly long _moviChunkDataStartPosition;

    private int _frameCount;
    private bool _finalized;

    public MjpegAviWriter(string outputPath, int width, int height, int fps)
    {
        _width = width;
        _height = height;
        _fps = fps;

        _stream = new FileStream(outputPath, FileMode.Create, FileAccess.ReadWrite, FileShare.Read);
        _writer = new BinaryWriter(_stream, Encoding.ASCII, leaveOpen: true);

        WriteFourCc("RIFF");
        _riffSizePosition = _stream.Position;
        _writer.Write(0u);
        WriteFourCc("AVI ");

        WriteFourCc("LIST");
        var hdrlSizePosition = _stream.Position;
        _writer.Write(0u);
        var hdrlDataStart = _stream.Position;
        WriteFourCc("hdrl");

        WriteFourCc("avih");
        _writer.Write(56u);
        _writer.Write((uint)Math.Max(1, 1_000_000 / _fps)); // dwMicroSecPerFrame
        _writer.Write((uint)(_width * _height * 3 * _fps)); // dwMaxBytesPerSec (rough estimate)
        _writer.Write(0u);                                   // dwPaddingGranularity
        _writer.Write(0x10u);                                // dwFlags (AVIF_HASINDEX)
        _avihTotalFramesPosition = _stream.Position;
        _writer.Write(0u);                                   // dwTotalFrames
        _writer.Write(0u);                                   // dwInitialFrames
        _writer.Write(1u);                                   // dwStreams
        _writer.Write((uint)(_width * _height * 3));        // dwSuggestedBufferSize
        _writer.Write((uint)_width);                         // dwWidth
        _writer.Write((uint)_height);                        // dwHeight
        _writer.Write(0u);
        _writer.Write(0u);
        _writer.Write(0u);
        _writer.Write(0u);

        WriteFourCc("LIST");
        var strlSizePosition = _stream.Position;
        _writer.Write(0u);
        var strlDataStart = _stream.Position;
        WriteFourCc("strl");

        WriteFourCc("strh");
        _writer.Write(56u);
        WriteFourCc("vids");
        WriteFourCc("MJPG");
        _writer.Write(0u);              // dwFlags
        _writer.Write((ushort)0);       // wPriority
        _writer.Write((ushort)0);       // wLanguage
        _writer.Write(0u);              // dwInitialFrames
        _writer.Write(1u);              // dwScale
        _writer.Write((uint)_fps);      // dwRate
        _writer.Write(0u);              // dwStart
        _strhLengthPosition = _stream.Position;
        _writer.Write(0u);              // dwLength
        _writer.Write((uint)(_width * _height * 3)); // dwSuggestedBufferSize
        _writer.Write(0xFFFFFFFFu);     // dwQuality
        _writer.Write(0u);              // dwSampleSize
        _writer.Write((short)0);        // rcFrame.left
        _writer.Write((short)0);        // rcFrame.top
        _writer.Write((short)_width);   // rcFrame.right
        _writer.Write((short)_height);  // rcFrame.bottom

        WriteFourCc("strf");
        _writer.Write(40u);             // BITMAPINFOHEADER size
        _writer.Write(40u);             // biSize
        _writer.Write(_width);          // biWidth
        _writer.Write(_height);         // biHeight
        _writer.Write((ushort)1);       // biPlanes
        _writer.Write((ushort)24);      // biBitCount
        WriteFourCc("MJPG");            // biCompression
        _writer.Write((uint)(_width * _height * 3)); // biSizeImage
        _writer.Write(0);               // biXPelsPerMeter
        _writer.Write(0);               // biYPelsPerMeter
        _writer.Write(0u);              // biClrUsed
        _writer.Write(0u);              // biClrImportant

        PatchDword(strlSizePosition, checked((uint)(_stream.Position - strlDataStart)));
        PatchDword(hdrlSizePosition, checked((uint)(_stream.Position - hdrlDataStart)));

        WriteFourCc("LIST");
        _moviListSizePosition = _stream.Position;
        _writer.Write(0u);
        _moviListDataStartPosition = _stream.Position;
        WriteFourCc("movi");
        _moviChunkDataStartPosition = _stream.Position;
    }

    public void WriteFrame(byte[] jpegFrame)
    {
        if (_finalized)
        {
            throw new InvalidOperationException("AVI writer has been finalized.");
        }
        if (jpegFrame.Length == 0)
        {
            return;
        }

        var chunkOffset = checked((uint)(_stream.Position - _moviChunkDataStartPosition));
        WriteFourCc("00dc");
        _writer.Write((uint)jpegFrame.Length);
        _writer.Write(jpegFrame);
        if ((jpegFrame.Length & 1) != 0)
        {
            _writer.Write((byte)0);
        }

        _indexEntries.Add(new AviIndexEntry(chunkOffset, (uint)jpegFrame.Length));
        _frameCount += 1;
    }

    public ValueTask DisposeAsync()
    {
        FinalizeFile();
        _writer.Dispose();
        _stream.Dispose();
        return ValueTask.CompletedTask;
    }

    private void FinalizeFile()
    {
        if (_finalized)
        {
            return;
        }
        _finalized = true;

        var moviListEnd = _stream.Position;
        PatchDword(_moviListSizePosition, checked((uint)(moviListEnd - _moviListDataStartPosition)));

        WriteFourCc("idx1");
        _writer.Write((uint)(_indexEntries.Count * 16));
        foreach (var entry in _indexEntries)
        {
            WriteFourCc("00dc");
            _writer.Write(0x10u); // AVIIF_KEYFRAME
            _writer.Write(entry.Offset);
            _writer.Write(entry.Size);
        }

        var fileEnd = _stream.Position;
        PatchDword(_avihTotalFramesPosition, (uint)_frameCount);
        PatchDword(_strhLengthPosition, (uint)_frameCount);
        PatchDword(_riffSizePosition, checked((uint)(fileEnd - 8)));

        _stream.Flush(flushToDisk: true);
    }

    private void PatchDword(long position, uint value)
    {
        var current = _stream.Position;
        _stream.Position = position;
        _writer.Write(value);
        _stream.Position = current;
    }

    private void WriteFourCc(string code)
    {
        if (code.Length != 4)
        {
            throw new ArgumentException("FOURCC must be exactly 4 characters.", nameof(code));
        }
        _writer.Write(Encoding.ASCII.GetBytes(code));
    }

    private readonly record struct AviIndexEntry(uint Offset, uint Size);
}
