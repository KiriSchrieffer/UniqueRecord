using ScreenRecorderLib;

namespace UniqueRecord.CaptureHost;

internal sealed class ScreenRecorderLibCaptureEngine : ICaptureEngine
{
    private readonly object _sync = new();

    private Recorder? _recorder;
    private TaskCompletionSource<RecordingCompleteEventArgs>? _completedTcs;
    private TaskCompletionSource<RecordingFailedEventArgs>? _failedTcs;
    private EventHandler<RecordingCompleteEventArgs>? _onCompleted;
    private EventHandler<RecordingFailedEventArgs>? _onFailed;

    public Task StartAsync(CaptureHostOptions options, CancellationToken cancellationToken)
    {
        _ = cancellationToken;
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException("ScreenRecorderLib capture is supported on Windows only.");
        }

        var container = options.Container.Trim().TrimStart('.').ToLowerInvariant();
        if (container != "mp4")
        {
            throw new InvalidOperationException(
                $"unsupported_container: {options.Container}. ScreenRecorderLib mode supports mp4."
            );
        }

        var outputPath = Path.GetFullPath(options.OutputPath);
        var outputDir = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrWhiteSpace(outputDir))
        {
            Directory.CreateDirectory(outputDir);
        }

        var recorderOptions = BuildRecorderOptions(options);
        var recorder = Recorder.CreateRecorder(recorderOptions);
        var completedTcs = new TaskCompletionSource<RecordingCompleteEventArgs>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );
        var failedTcs = new TaskCompletionSource<RecordingFailedEventArgs>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );

        EventHandler<RecordingCompleteEventArgs> onCompleted = (_, args) =>
        {
            completedTcs.TrySetResult(args);
        };
        EventHandler<RecordingFailedEventArgs> onFailed = (_, args) =>
        {
            failedTcs.TrySetResult(args);
        };
        recorder.OnRecordingComplete += onCompleted;
        recorder.OnRecordingFailed += onFailed;

        lock (_sync)
        {
            if (_recorder is not null)
            {
                throw new InvalidOperationException("capture session already running");
            }
            _recorder = recorder;
            _completedTcs = completedTcs;
            _failedTcs = failedTcs;
            _onCompleted = onCompleted;
            _onFailed = onFailed;
        }

        recorder.Record(outputPath);
        return Task.CompletedTask;
    }

    public async Task StopAsync(CaptureHostOptions options, CancellationToken cancellationToken)
    {
        _ = options;
        Recorder? recorder;
        Task<RecordingCompleteEventArgs>? completedTask;
        Task<RecordingFailedEventArgs>? failedTask;

        lock (_sync)
        {
            recorder = _recorder;
            completedTask = _completedTcs?.Task;
            failedTask = _failedTcs?.Task;
        }

        if (recorder is null)
        {
            return;
        }

        recorder.Stop();

        if (completedTask is null || failedTask is null)
        {
            throw new InvalidOperationException("invalid recorder completion state");
        }

        var timeoutTask = Task.Delay(TimeSpan.FromSeconds(15), cancellationToken);
        var finishedTask = await Task.WhenAny(completedTask, failedTask, timeoutTask);
        if (finishedTask == timeoutTask)
        {
            throw new TimeoutException("recording stop timeout");
        }
        if (finishedTask == failedTask)
        {
            var failed = await failedTask;
            throw new InvalidOperationException(failed.Error ?? "recording_failed");
        }

        CleanupRecorder();
    }

    public ValueTask DisposeAsync()
    {
        CleanupRecorder();
        return ValueTask.CompletedTask;
    }

    private void CleanupRecorder()
    {
        lock (_sync)
        {
            if (_recorder is null)
            {
                return;
            }

            if (_onCompleted is not null)
            {
                _recorder.OnRecordingComplete -= _onCompleted;
            }
            if (_onFailed is not null)
            {
                _recorder.OnRecordingFailed -= _onFailed;
            }
            _recorder.Dispose();
            _recorder = null;
            _completedTcs = null;
            _failedTcs = null;
            _onCompleted = null;
            _onFailed = null;
        }
    }

    private static RecorderOptions BuildRecorderOptions(CaptureHostOptions options)
    {
        var fps = Math.Clamp(options.Fps.GetValueOrDefault(60), 5, 120);
        var width = Math.Clamp(options.Width.GetValueOrDefault(1920), 320, 7680);
        var height = Math.Clamp(options.Height.GetValueOrDefault(1080), 240, 4320);
        var encoderName = NormalizeEncoder(options.Encoder);
        var audioCodecName = NormalizeAudioCodec(options.AudioCodec);
        if (!string.IsNullOrWhiteSpace(audioCodecName) && audioCodecName != "aac")
        {
            throw new InvalidOperationException(
                $"unsupported_audio_codec: {options.AudioCodec}. ScreenRecorderLib mp4 mode supports AAC."
            );
        }

        var recorderOptions = RecorderOptions.Default;
        recorderOptions.SourceOptions = SourceOptions.MainMonitor;
        recorderOptions.OutputOptions = recorderOptions.OutputOptions ?? new OutputOptions();
        recorderOptions.OutputOptions.RecorderMode = RecorderMode.Video;
        recorderOptions.OutputOptions.OutputFrameSize = new ScreenSize(width, height);
        recorderOptions.OutputOptions.Stretch = StretchMode.Uniform;

        recorderOptions.VideoEncoderOptions = recorderOptions.VideoEncoderOptions ?? new VideoEncoderOptions();
        recorderOptions.VideoEncoderOptions.Encoder = new H264VideoEncoder
        {
            BitrateMode = H264BitrateControlMode.CBR,
            EncoderProfile = ResolveProfile(encoderName),
        };
        recorderOptions.VideoEncoderOptions.Framerate = fps;
        recorderOptions.VideoEncoderOptions.Bitrate = ResolveVideoBitrate(options, width, height, fps);
        recorderOptions.VideoEncoderOptions.IsHardwareEncodingEnabled = ResolveHardwareEncodingEnabled(
            options,
            encoderName
        );
        recorderOptions.VideoEncoderOptions.IsMp4FastStartEnabled = true;
        recorderOptions.VideoEncoderOptions.IsFixedFramerate = true;

        recorderOptions.AudioOptions = recorderOptions.AudioOptions ?? new AudioOptions();
        var inputEnabled = options.AudioInputEnabled ?? true;
        var outputEnabled = options.AudioOutputEnabled ?? true;
        recorderOptions.AudioOptions.IsAudioEnabled = inputEnabled || outputEnabled;
        recorderOptions.AudioOptions.IsOutputDeviceEnabled = outputEnabled;
        recorderOptions.AudioOptions.IsInputDeviceEnabled = inputEnabled;
        recorderOptions.AudioOptions.Bitrate = ResolveAudioBitrate(options.AudioBitrateKbps);
        recorderOptions.AudioOptions.Channels = AudioChannels.Stereo;
        recorderOptions.AudioOptions.OutputVolume = 1.0f;
        recorderOptions.AudioOptions.InputVolume = 1.0f;
        var audioInputDevice = NormalizeAudioInputDevice(options.AudioInputDevice);
        if (inputEnabled && !string.IsNullOrWhiteSpace(audioInputDevice))
        {
            recorderOptions.AudioOptions.AudioInputDevice = audioInputDevice;
        }

        recorderOptions.MouseOptions = recorderOptions.MouseOptions ?? new MouseOptions();
        recorderOptions.MouseOptions.IsMousePointerEnabled = true;

        return recorderOptions;
    }

    private static int EstimateVideoBitrate(int width, int height, int fps)
    {
        // Rough target derived from pixel rate, clamped for practical desktop usage.
        var pixelsPerSecond = (double)width * height * fps;
        var estimate = (int)(pixelsPerSecond * 0.10);
        return Math.Clamp(estimate, 4_000_000, 35_000_000);
    }

    private static int ResolveVideoBitrate(CaptureHostOptions options, int width, int height, int fps)
    {
        var requestedKbps = options.VideoBitrateKbps.GetValueOrDefault(0);
        if (requestedKbps <= 0)
        {
            return EstimateVideoBitrate(width, height, fps);
        }
        return Math.Clamp(requestedKbps * 1000, 1_000_000, 100_000_000);
    }

    private static AudioBitrate ResolveAudioBitrate(int? requestedKbps)
    {
        if (!requestedKbps.HasValue)
        {
            return AudioBitrate.bitrate_192kbps;
        }
        return requestedKbps.Value switch
        {
            >= 192 => AudioBitrate.bitrate_192kbps,
            >= 160 => AudioBitrate.bitrate_160kbps,
            >= 128 => AudioBitrate.bitrate_128kbps,
            _ => AudioBitrate.bitrate_96kbps,
        };
    }

    private static bool ResolveHardwareEncodingEnabled(CaptureHostOptions options, string encoderName)
    {
        if (options.HardwareEncodingEnabled.HasValue)
        {
            return options.HardwareEncodingEnabled.Value;
        }
        return encoderName != "x264";
    }

    private static H264Profile ResolveProfile(string encoderName)
    {
        return encoderName == "x264" ? H264Profile.High : H264Profile.Main;
    }

    private static string NormalizeEncoder(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "auto";
        }
        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "x264" => "x264",
            "nvenc" => "nvenc",
            "qsv" => "qsv",
            "amf" => "amf",
            _ => "auto",
        };
    }

    private static string? NormalizeAudioCodec(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }
        return value.Trim().ToLowerInvariant();
    }

    private static string? NormalizeAudioInputDevice(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }
        var normalized = value.Trim();
        if (string.Equals(normalized, "__default__", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }
        return normalized;
    }
}
