
namespace MyCitiesDataAccess.Dtos
{
    public class LocationFilterOptionDto
    {
        public string FilterType { get; set; } = string.Empty;

        public int FilterId { get; set; }

        public string FilterValue { get; set; } = string.Empty;

        public string FilterLabel { get; set; } = string.Empty;
    }
}
