using System.ComponentModel.DataAnnotations;

namespace MyCitiesDataAccess.Dtos
{
    public class MyCityDto
    {
        public int Id { get; set; } // generated in memory for V1 

        [Required] public string City { get; set; } = string.Empty;
        [Required] public string Country { get; set; } = string.Empty;
        [Required] public string Region { get; set; } = string.Empty;

        public double Lat { get; set; }
        public double Lon { get; set; }

        [Required] public string StayDuration { get; set; } = string.Empty;
        [Required] public string Decades { get; set; } = string.Empty;

        public string? Notes { get; set; } 
    }
}
