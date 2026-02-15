using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyCitiesDataAccess.Models;

[Table("Country")]
[Index("Iso2", Name = "UQ_Country_Iso2", IsUnique = true)]
[Index("Iso3", Name = "UQ_Country_Iso3", IsUnique = true)]
[Index("M49", Name = "UQ_Country_M49", IsUnique = true)]
public partial class Country
{
    [Key]
    public int CountryId { get; set; }

    [StringLength(2)]
    [Unicode(false)]
    public string Iso2 { get; set; } = null!;

    [StringLength(3)]
    [Unicode(false)]
    public string Iso3 { get; set; } = null!;

    public int? M49 { get; set; }

    [StringLength(150)]
    public string DisplayName { get; set; } = null!;

    [StringLength(200)]
    public string? OfficialName { get; set; }

    public bool IsActive { get; set; }

    [InverseProperty("Country")]
    public virtual ICollection<MyCity> MyCities { get; set; } = new List<MyCity>();
}
