using BlogApi.Models;

namespace BlogApi.Services
{
    /// <summary>
    /// 缩略图 URL 构造器。
    /// 供 <see cref="GalleryService"/> 与 <see cref="ArticleService"/> 共用，
    /// 根据 <see cref="CfImageConfig"/> 生成 Cloudflare Image Resizing 或 Worker 风格的缩略图地址。
    /// </summary>
    public static class ThumbnailUrlBuilder
    {
        /// <summary>
        /// 根据配置生成缩略图 URL。
        /// 配置缺失、关闭或 URL 非法时回退原图地址。
        /// </summary>
        public static string? BuildThumbnailUrl(string imageUrl, CfImageConfig? config)
        {
            if (string.IsNullOrWhiteSpace(imageUrl)) return null;
            if (config == null || !config.IsEnabled) return imageUrl;
            if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var sourceUri)) return imageUrl;

            if (config.UseWorker)
            {
                // Worker 生成失败时回退原图，保证前台至少可展示。
                var workerUrl = BuildWorkerThumbnailUrl(sourceUri, config);
                return string.IsNullOrWhiteSpace(workerUrl) ? imageUrl : workerUrl;
            }

            return BuildCdnThumbnailUrl(sourceUri, imageUrl, config);
        }

        /// <summary>
        /// 生成 Cloudflare Image Resizing（cdn-cgi）风格缩略图 URL。
        /// </summary>
        private static string? BuildCdnThumbnailUrl(Uri sourceUri, string imageUrl, CfImageConfig config)
        {
            string? baseHost = null;
            string? zoneScheme = null;
            if (!string.IsNullOrWhiteSpace(config.ZoneDomain))
            {
                var trimmedZone = config.ZoneDomain.Trim();
                if (Uri.TryCreate(trimmedZone, UriKind.Absolute, out var zoneUri))
                {
                    baseHost = zoneUri.Host;
                    zoneScheme = zoneUri.Scheme;
                }
                else
                {
                    baseHost = trimmedZone;
                }
            }

            baseHost ??= sourceUri.Host;

            var scheme = config.UseHttps
                ? "https"
                : (string.IsNullOrWhiteSpace(zoneScheme) ? sourceUri.Scheme : zoneScheme);

            var options = new List<string>();
            if (!string.IsNullOrWhiteSpace(config.Fit)) options.Add($"fit={config.Fit}");
            if (config.Width > 0) options.Add($"width={config.Width}");
            if (config.Quality > 0) options.Add($"quality={config.Quality}");
            if (!string.IsNullOrWhiteSpace(config.Format)) options.Add($"format={config.Format}");

            var optionString = options.Count > 0 ? string.Join(',', options) : "";

            var baseUrl = $"{scheme}://{baseHost}/cdn-cgi/image/{optionString}/{imageUrl}";
            // 可选签名：支持 HMAC secret 或固定 token。
            var signature = BuildSignature(optionString, imageUrl, config);
            if (!string.IsNullOrWhiteSpace(signature))
            {
                baseUrl = baseUrl.Contains('?') ? $"{baseUrl}&{signature}" : $"{baseUrl}?{signature}";
            }

            return baseUrl;
        }

        /// <summary>
        /// 生成 Worker 缩略图 URL（带过期时间与签名）。
        /// </summary>
        private static string? BuildWorkerThumbnailUrl(Uri sourceUri, CfImageConfig config)
        {
            if (string.IsNullOrWhiteSpace(config.WorkerBaseUrl)) return null;
            if (string.IsNullOrWhiteSpace(config.SignatureSecret)) return null;

            var baseUrl = config.WorkerBaseUrl.Trim().TrimEnd('/');

            var path = sourceUri.AbsolutePath;
            if (path.StartsWith("/file/", StringComparison.OrdinalIgnoreCase))
            {
                path = path.Substring("/file/".Length);
            }
            else
            {
                // 非 /file/ 前缀时仍尝试按绝对路径去掉 leading slash。
                path = path.TrimStart('/');
            }

            if (string.IsNullOrWhiteSpace(path)) return null;

            var width = config.Width > 0 ? config.Width : 300;
            var quality = config.Quality > 0 ? config.Quality : 50;
            var format = string.IsNullOrWhiteSpace(config.Format) ? "webp" : config.Format;
            var fit = string.IsNullOrWhiteSpace(config.Fit) ? "scale-down" : config.Fit;
            var ttl = config.TokenTtlSeconds > 0 ? config.TokenTtlSeconds : 3600;
            var exp = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + ttl;

            var data = $"{path}|{width}|{quality}|{format}|{fit}|{exp}";
            var sig = BuildHmacSignature(data, config.SignatureSecret);
            if (string.IsNullOrWhiteSpace(sig)) return null;

            var param = string.IsNullOrWhiteSpace(config.SignatureParam) ? "sig" : config.SignatureParam.Trim();

            return $"{baseUrl}/thumb/{path}?w={width}&q={quality}&fmt={format}&fit={fit}&exp={exp}&{param}={sig}";
        }

        /// <summary>
        /// 生成签名参数字符串。
        /// 优先 secret(HMAC)；未提供 secret 时回退静态 token。
        /// </summary>
        private static string? BuildSignature(string optionString, string imageUrl, CfImageConfig config)
        {
            if (!string.IsNullOrWhiteSpace(config.SignatureSecret))
            {
                var param = string.IsNullOrWhiteSpace(config.SignatureParam) ? "sig" : config.SignatureParam.Trim();
                var data = $"{optionString}|{imageUrl}";
                var sig = BuildHmacSignature(data, config.SignatureSecret);
                return $"{param}={sig}";
            }

            if (!string.IsNullOrWhiteSpace(config.SignatureToken))
            {
                var param = string.IsNullOrWhiteSpace(config.SignatureParam) ? "sig" : config.SignatureParam.Trim();
                return $"{param}={config.SignatureToken}";
            }

            return null;
        }

        /// <summary>
        /// 计算 HMAC-SHA256 签名，输出小写十六进制。
        /// </summary>
        private static string? BuildHmacSignature(string data, string secret)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(data));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }
    }
}
