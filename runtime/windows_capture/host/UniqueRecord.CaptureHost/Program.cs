using System.Text.Json;
using ScreenRecorderLib;

namespace UniqueRecord.CaptureHost;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        if (args.Length == 1 && string.Equals(args[0], "--list-audio-devices", StringComparison.OrdinalIgnoreCase))
        {
            return ListAudioDevices();
        }

        CaptureHostOptions options;
        try
        {
            options = CaptureHostOptions.Parse(args);
        }
        catch (Exception ex)
        {
            WriteError("invalid_arguments", ex.Message);
            return 2;
        }

        using var shutdown = new CancellationTokenSource();
        Console.CancelKeyPress += (_, evt) =>
        {
            evt.Cancel = true;
            shutdown.Cancel();
        };

        var stopSignalPath = Path.GetFullPath(options.StopSignalPath);
        var stopSignalDir = Path.GetDirectoryName(stopSignalPath);
        if (!string.IsNullOrWhiteSpace(stopSignalDir))
        {
            Directory.CreateDirectory(stopSignalDir);
        }

        await using var engine = CreateCaptureEngine(options);
        var mode = ResolveEngineMode(engine);
        try
        {
            await engine.StartAsync(options, shutdown.Token);
        }
        catch (Exception ex)
        {
            WriteError("capture_start_failed", ex.Message);
            return 1;
        }

        Console.WriteLine(JsonSerializer.Serialize(new
        {
            status = "capture_started",
            mode,
            output = Path.GetFullPath(options.OutputPath),
            stop_signal = stopSignalPath,
            session_id = options.SessionId,
            container = options.Container,
        }));

        try
        {
            await WaitForStopSignalAsync(stopSignalPath, shutdown.Token);
        }
        catch (OperationCanceledException)
        {
            // Controlled shutdown path.
        }
        catch (Exception ex)
        {
            WriteError("capture_wait_failed", ex.Message);
            return 1;
        }

        try
        {
            await engine.StopAsync(options, CancellationToken.None);
        }
        catch (Exception ex)
        {
            WriteError("capture_stop_failed", ex.Message);
            return 1;
        }

        Console.WriteLine(JsonSerializer.Serialize(new
        {
            status = "capture_stopped",
            mode,
            output = Path.GetFullPath(options.OutputPath),
            session_id = options.SessionId,
            container = options.Container,
        }));
        return 0;
    }

    private static int ListAudioDevices()
    {
        try
        {
            var inputDevices = Recorder.GetSystemAudioDevices(AudioDeviceSource.InputDevices)
                .Select(ToAudioDevicePayload)
                .ToList();
            var outputDevices = Recorder.GetSystemAudioDevices(AudioDeviceSource.OutputDevices)
                .Select(ToAudioDevicePayload)
                .ToList();
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                status = "audio_devices",
                supported = true,
                input_devices = inputDevices,
                output_devices = outputDevices,
            }));
            return 0;
        }
        catch (Exception ex)
        {
            WriteError("audio_devices_failed", ex.Message);
            return 1;
        }
    }

    private static ICaptureEngine CreateCaptureEngine(CaptureHostOptions options)
    {
        var container = options.Container.Trim().TrimStart('.').ToLowerInvariant();
        if (container == "avi")
        {
            return new GdiMjpegCaptureEngine();
        }
        return new ScreenRecorderLibCaptureEngine();
    }

    private static string ResolveEngineMode(ICaptureEngine engine)
    {
        return engine switch
        {
            ScreenRecorderLibCaptureEngine => "screenrecorderlib_mp4",
            GdiMjpegCaptureEngine => "windows_gdi_mjpeg_avi",
            _ => "unknown",
        };
    }

    private static async Task WaitForStopSignalAsync(string stopSignalPath, CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            if (File.Exists(stopSignalPath))
            {
                return;
            }

            await Task.Delay(250, cancellationToken);
        }
    }

    private static void WriteError(string code, string message)
    {
        Console.Error.WriteLine(JsonSerializer.Serialize(new
        {
            status = "error",
            code,
            message
        }));
    }

    private static object ToAudioDevicePayload(AudioDevice device)
    {
        return new
        {
            device_name = device.DeviceName,
            friendly_name = device.FriendlyName,
        };
    }
}
