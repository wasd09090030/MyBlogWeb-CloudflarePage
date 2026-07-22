using System.Text.RegularExpressions;
using BlogApi.Models;

namespace BlogApi.Services
{
    public class ImageAssetUrlService
    {
        private static readonly Regex PublicIdRegex = new(@"^i_[A-Za-z0-9_-]{8,48}$", RegexOptions.Compiled);

        public bool IsValidPublicId(string? publicId)
        {
            return !string.IsNullOrWhiteSpace(publicId) && PublicIdRegex.IsMatch(publicId);
        }

        public string? BuildThumbnailUrl(ImageAsset? asset)
        {
            if (asset == null || !asset.IsActive || !IsValidPublicId(asset.PublicId))
            {
                return null;
            }

            return $"/images/thumb/{asset.PublicId}.webp";
        }
    }
}
