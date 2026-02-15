using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyCitiesDataAccess.Models;

[Table("Region")]
[Index("GroupName", "RegionName", Name = "UQ_Region_Group_Region", IsUnique = true)]
[Index("RegionName", Name = "UQ_Region_RegionName", IsUnique = true)]
public partial class Region
{
    [Key]
    public int RegionId { get; set; }

    [StringLength(50)]
    public string GroupName { get; set; } = null!;

    public byte GroupSortOrder { get; set; }

    [StringLength(50)]
    public string RegionName { get; set; } = null!;

    public byte RegionSortOrder { get; set; }

    [InverseProperty("Region")]
    public virtual ICollection<MyCity> MyCities { get; set; } = new List<MyCity>();
}
