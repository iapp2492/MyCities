using Microsoft.EntityFrameworkCore;
using MyCitiesDataAccess.Models;

namespace MyCitiesDataAccess.Contexts;

public partial class MyCitiesDbContext : DbContext
{
    public MyCitiesDbContext(DbContextOptions<MyCitiesDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Country> Countries { get; set; }

    public virtual DbSet<Decade> Decades { get; set; }

    public virtual DbSet<MyCity> MyCities { get; set; }

    public virtual DbSet<MyCityDecade> MyCityDecades { get; set; }

    public virtual DbSet<Region> Regions { get; set; }

    public virtual DbSet<StayDuration> StayDurations { get; set; }

    public virtual DbSet<vw_MyCity_Spreadsheet> vw_MyCity_Spreadsheet { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Country>(entity =>
        {
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Iso2).IsFixedLength();
            entity.Property(e => e.Iso3).IsFixedLength();
        });

        modelBuilder.Entity<Decade>(entity =>
        {
            entity.HasKey(e => e.DecadeId).HasName("PK__Decade__97BB368843A0D342");

            entity.Property(e => e.Label).HasComputedColumnSql("(concat([StartYear],'s'))", true);
        });

        modelBuilder.Entity<MyCity>(entity =>
        {
            entity.HasOne(d => d.Country).WithMany(p => p.MyCities)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MyCity_Country");

            entity.HasOne(d => d.Region).WithMany(p => p.MyCities)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MyCity_Region");

            entity.HasOne(d => d.StayDuration).WithMany(p => p.MyCities)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MyCity_StayDuration");
        });

        modelBuilder.Entity<MyCityDecade>(entity =>
        {
            entity.HasOne(d => d.Decade).WithMany(p => p.MyCityDecades)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MyCityDecade_Decade");

            entity.HasOne(d => d.MyCity).WithMany(p => p.MyCityDecades).HasConstraintName("FK_MyCityDecade_MyCity");
        });

        modelBuilder.Entity<StayDuration>(entity =>
        {
            entity.HasKey(e => e.StayDurationId).HasName("PK__StayDura__D924621A67780D0C");
        });

        modelBuilder.Entity<vw_MyCity_Spreadsheet>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("vw_MyCity_Spreadsheet");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
