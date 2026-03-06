using System.Globalization;

namespace UniqueRecord.CaptureHost;

internal sealed record CaptureHostOptions(
    string OutputPath,
    string StopSignalPath,
    string SessionId,
    string Container,
    long StartTsMs,
    int? Fps,
    int? Width,
    int? Height,
    int? VideoBitrateKbps,
    int? AudioBitrateKbps,
    string? Encoder,
    string? AudioCodec,
    bool? HardwareEncodingEnabled,
    string? AudioInputDevice,
    bool? AudioInputEnabled,
    bool? AudioOutputEnabled,
    string? WindowTitle,
    string? WindowClass,
    string? DisplayId
)
{
    public static CaptureHostOptions Parse(string[] args)
    {
        if (args.Length == 0)
        {
            throw new ArgumentException("No arguments provided.");
        }

        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < args.Length; i++)
        {
            var current = args[i];
            if (!current.StartsWith("--", StringComparison.Ordinal))
            {
                throw new ArgumentException($"Unexpected token: {current}");
            }

            var key = current[2..];
            if (i + 1 >= args.Length || args[i + 1].StartsWith("--", StringComparison.Ordinal))
            {
                throw new ArgumentException($"Missing value for argument --{key}");
            }

            values[key] = args[i + 1];
            i += 1;
        }

        var outputPath = Required(values, "output");
        var stopSignalPath = Required(values, "stop-signal");
        var sessionId = Required(values, "session-id");
        var container = values.TryGetValue("container", out var containerRaw) && !string.IsNullOrWhiteSpace(containerRaw)
            ? containerRaw.Trim().TrimStart('.')
            : "mp4";
        var startTsMs = TryParseLong(values, "start-ts-ms") ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        return new CaptureHostOptions(
            OutputPath: outputPath,
            StopSignalPath: stopSignalPath,
            SessionId: sessionId,
            Container: container,
            StartTsMs: startTsMs,
            Fps: TryParseInt(values, "fps"),
            Width: TryParseInt(values, "width"),
            Height: TryParseInt(values, "height"),
            VideoBitrateKbps: TryParseInt(values, "video-bitrate-kbps"),
            AudioBitrateKbps: TryParseInt(values, "audio-bitrate-kbps"),
            Encoder: Optional(values, "encoder"),
            AudioCodec: Optional(values, "audio-codec"),
            HardwareEncodingEnabled: TryParseBool(values, "hardware-encoding-enabled"),
            AudioInputDevice: Optional(values, "audio-input-device"),
            AudioInputEnabled: TryParseBool(values, "audio-input-enabled"),
            AudioOutputEnabled: TryParseBool(values, "audio-output-enabled"),
            WindowTitle: Optional(values, "window-title"),
            WindowClass: Optional(values, "window-class"),
            DisplayId: Optional(values, "display-id")
        );
    }

    private static string Required(IReadOnlyDictionary<string, string> values, string key)
    {
        if (!values.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw))
        {
            throw new ArgumentException($"Missing required argument --{key}");
        }

        return raw.Trim();
    }

    private static string? Optional(IReadOnlyDictionary<string, string> values, string key)
    {
        if (!values.TryGetValue(key, out var raw))
        {
            return null;
        }

        return string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();
    }

    private static int? TryParseInt(IReadOnlyDictionary<string, string> values, string key)
    {
        if (!values.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return int.TryParse(raw.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static long? TryParseLong(IReadOnlyDictionary<string, string> values, string key)
    {
        if (!values.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return long.TryParse(raw.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static bool? TryParseBool(IReadOnlyDictionary<string, string> values, string key)
    {
        if (!values.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var normalized = raw.Trim().ToLowerInvariant();
        return normalized switch
        {
            "1" => true,
            "true" => true,
            "yes" => true,
            "on" => true,
            "0" => false,
            "false" => false,
            "no" => false,
            "off" => false,
            _ => null,
        };
    }
}
