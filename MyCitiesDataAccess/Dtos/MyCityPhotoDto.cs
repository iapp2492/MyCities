
namespace MyCitiesDataAccess.Dtos
{
    public sealed class MyCityPhotoDto
    {
        public int PhotoKey { get; init; }
        public int PhotoIndex { get; init; }
        public int SortOrder { get; init; }
        public string Title { get; init; } = string.Empty;
        public string Caption { get; init; } = string.Empty;
        public string FileName { get; init; } = string.Empty;

        // Convenience for the UI
        public string Url { get; init; } = string.Empty;
    }
}

