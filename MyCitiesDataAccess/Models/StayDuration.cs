using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyCitiesDataAccess.Models;

[Table("StayDuration")]
[Index("Label", Name = "UQ_StayDuration_Label", IsUnique = true)]
public partial class StayDuration
{
    [Key]
    public int StayDurationId { get; set; }

    [StringLength(50)]
    public string Label { get; set; } = null!;

    public int SortOrder { get; set; }

    [InverseProperty("StayDuration")]
    public virtual ICollection<MyCity> MyCities { get; set; } = new List<MyCity>();
}
