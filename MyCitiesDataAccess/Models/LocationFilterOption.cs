
namespace MyCitiesDataAccess.Models
{
    public class LocationFilterOption
    {
        public string FilterType { get; set; } = string.Empty;

        public int FilterId { get; set; }

        public string FilterValue { get; set; } = string.Empty;

        public string FilterLabel { get; set; } = string.Empty;

        public int PrimarySort { get; set; }

        public int SecondarySort { get; set; }
    }
}
