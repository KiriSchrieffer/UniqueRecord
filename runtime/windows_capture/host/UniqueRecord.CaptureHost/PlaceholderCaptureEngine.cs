using System.Text;
using System.Text.Json;

namespace UniqueRecord.CaptureHost;

internal interface ICaptureEngine : IAsyncDisposable
{
    Task StartAsync(CaptureHostOptions options, CancellationToken cancellationToken);
    Task StopAsync(CaptureHostOptions options, CancellationToken cancellationToken);
}

internal sealed class PlaceholderCaptureEngine : ICaptureEngine
{
    private FileStream? _stream;
    private StreamWriter? _writer;

    public async Task StartAsync(CaptureHostOptions options, CancellationToken cancellationToken)
    {
        var outputPath = Path.GetFullPath(options.OutputPath);
        var outputDir = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrWhiteSpace(outputDir))
        {
            Directory.CreateDirectory(outputDir);
        }

        _stream = new FileStream(
            outputPath,
            FileMode.Create,
            FileAccess.Write,
            FileShare.Read);
        _writer = new StreamWriter(_stream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false), leaveOpen: true);

        var startedPayload = new
        {
            mode = "placeholder",
            started_at_utc = DateTimeOffset.UtcNow,
            session_id = options.SessionId,
            output = outputPath,
            container = options.Container,
            profile = new
            {
                fps = options.Fps,
                width = options.Width,
                height = options.Height,
                window_title = options.WindowTitle,
                window_class = options.WindowClass,
                display_id = options.DisplayId,
            }
        };
        await _writer.WriteLineAsync(JsonSerializer.Serialize(startedPayload, new JsonSerializerOptions
        {
            WriteIndented = false
        }));
        await _writer.FlushAsync(cancellationToken);
    }

    public async Task StopAsync(CaptureHostOptions options, CancellationToken cancellationToken)
    {
        if (_writer is not null)
        {
            var stoppedPayload = new
            {
                mode = "placeholder",
                stopped_at_utc = DateTimeOffset.UtcNow,
                session_id = options.SessionId
            };
            await _writer.WriteLineAsync(JsonSerializer.Serialize(stoppedPayload));
            await _writer.FlushAsync(cancellationToken);
        }

        _writer?.Dispose();
        _stream?.Dispose();
        _writer = null;
        _stream = null;
    }

    public ValueTask DisposeAsync()
    {
        _writer?.Dispose();
        _stream?.Dispose();
        _writer = null;
        _stream = null;
        return ValueTask.CompletedTask;
    }
}
