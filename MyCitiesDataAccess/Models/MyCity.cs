using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyCitiesDataAccess.Models;

[Table("MyCity")]
[Index("CountryId", Name = "IX_MyCity_CountryId")]
[Index("RegionId", Name = "IX_MyCity_RegionId")]
[Index("StayDurationId", Name = "IX_MyCity_StayDurationId")]
[Index("CityName", "CountryId", Name = "UQ_MyCity_CityCountry", IsUnique = true)]
[Index("CityName", "CountryId", Name = "UX_MyCity_City_Country", IsUnique = true)]
public partial class MyCity
{
    [Key]
    public int MyCityId { get; set; }

    [StringLength(100)]
    public string CityName { get; set; } = null!;

    public int CountryId { get; set; }

    public int RegionId { get; set; }

    [Column(TypeName = "decimal(9, 6)")]
    public decimal Latitude { get; set; }

    [Column(TypeName = "decimal(9, 6)")]
    public decimal Longitude { get; set; }

    public int StayDurationId { get; set; }

    public string? Notes { get; set; }

    [ForeignKey("CountryId")]
    [InverseProperty("MyCities")]
    public virtual Country Country { get; set; } = null!;

    [InverseProperty("MyCity")]
    public virtual ICollection<MyCityDecade> MyCityDecades { get; set; } = new List<MyCityDecade>();

    [ForeignKey("RegionId")]
    [InverseProperty("MyCities")]
    public virtual Region Region { get; set; } = null!;

    [ForeignKey("StayDurationId")]
    [InverseProperty("MyCities")]
    public virtual StayDuration StayDuration { get; set; } = null!;
}
