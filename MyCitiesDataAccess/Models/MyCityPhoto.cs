
namespace MyCitiesDataAccess.Models
{
    public sealed class MyCityPhoto
    {
        public int MyCityPhotoId { get; set; }

        public int PhotoKey { get; set; }

        public int PhotoIndex { get; set; }

        public int SortOrder { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Caption { get; set; } = string.Empty;

        public string FileName { get; set; } = string.Empty;

        public MyCity MyCity { get; set; } = null!;
    }
}
