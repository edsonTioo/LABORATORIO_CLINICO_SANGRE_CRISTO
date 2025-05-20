using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace APILABORATORIO.Models;

public partial class LaboratorioClinicoContext : DbContext
{
    public LaboratorioClinicoContext()
    {
    }

    public LaboratorioClinicoContext(DbContextOptions<LaboratorioClinicoContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Cliente> Clientes { get; set; }

    public virtual DbSet<DetalleFactura> DetalleFacturas { get; set; }

    public virtual DbSet<DetalleOrden> DetalleOrdens { get; set; }

    public virtual DbSet<Factura> Facturas { get; set; }

    public virtual DbSet<Medico> Medicos { get; set; }

    public virtual DbSet<Muestra> Muestras { get; set; }

    public virtual DbSet<Orden> Ordens { get; set; }

    public virtual DbSet<Parametro> Parametros { get; set; }

    public virtual DbSet<ResultadoExaman> ResultadoExamen { get; set; }

    public virtual DbSet<TipoExaman> TipoExamen { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Data Source=DESKTOP-BO9GSQO\\SQLEXPRESS02;Database=LaboratorioClinico;Trusted_Connection=True;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.HasKey(e => e.Idcliente).HasName("PK__Cliente__9B8553FCCECDBB69");

            entity.ToTable("Cliente");

            entity.Property(e => e.Idcliente).HasColumnName("IDCliente");
            entity.Property(e => e.Genero)
                .HasMaxLength(1)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(15)
                .IsUnicode(false);
        });

        modelBuilder.Entity<DetalleFactura>(entity =>
        {
            entity.HasKey(e => e.IddetalleFactura).HasName("PK__DetalleF__EF0E5D9A1F439C2D");

            entity.ToTable("DetalleFactura");

            entity.HasIndex(e => e.Idfactura, "idx_DetalleFactura_IDFactura");

            entity.Property(e => e.IddetalleFactura).HasColumnName("IDDetalleFactura");
            entity.Property(e => e.IddetalleOrden).HasColumnName("IDDetalleOrden");
            entity.Property(e => e.Idfactura).HasColumnName("IDFactura");
            entity.Property(e => e.Precio).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.Subtotal).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.IddetalleOrdenNavigation).WithMany(p => p.DetalleFacturas)
                .HasForeignKey(d => d.IddetalleOrden)
                .HasConstraintName("FK__DetalleFa__IDDet__403A8C7D");

            entity.HasOne(d => d.IdfacturaNavigation).WithMany(p => p.DetalleFacturas)
                .HasForeignKey(d => d.Idfactura)
                .HasConstraintName("FK__DetalleFa__IDFac__3D5E1FD2");
        });

        modelBuilder.Entity<DetalleOrden>(entity =>
        {
            entity.HasKey(e => e.IddetalleOrden).HasName("PK__DetalleO__5379976D41F2893E");

            entity.ToTable("DetalleOrden");

            entity.HasIndex(e => e.Idorden, "idx_DetalleOrden_IDOrden");

            entity.Property(e => e.IddetalleOrden).HasColumnName("IDDetalleOrden");
            entity.Property(e => e.Idmuestra).HasColumnName("IDMuestra");
            entity.Property(e => e.Idorden).HasColumnName("IDOrden");
            entity.Property(e => e.IdtipoExamen).HasColumnName("IDTipoExamen");

            entity.HasOne(d => d.IdmuestraNavigation).WithMany(p => p.DetalleOrdens)
                .HasForeignKey(d => d.Idmuestra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DetalleOrden_Muestra");

            entity.HasOne(d => d.IdordenNavigation).WithMany(p => p.DetalleOrdens)
                .HasForeignKey(d => d.Idorden)
                .HasConstraintName("FK__DetalleOr__IDOrd__300424B4");

            entity.HasOne(d => d.IdtipoExamenNavigation).WithMany(p => p.DetalleOrdens)
                .HasForeignKey(d => d.IdtipoExamen)
                .HasConstraintName("FK__DetalleOr__IDTip__30F848ED");
        });

        modelBuilder.Entity<Factura>(entity =>
        {
            entity.HasKey(e => e.Idfactura).HasName("PK__Factura__492FE939A56C5D23");

            entity.ToTable("Factura");

            entity.HasIndex(e => e.Idcliente, "idx_Factura_IDCliente");

            entity.Property(e => e.Idfactura).HasColumnName("IDFactura");
            entity.Property(e => e.FechaFactura)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Idcliente).HasColumnName("IDCliente");
            entity.Property(e => e.Idmedico).HasColumnName("IDMedico");
            entity.Property(e => e.Total).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.IdclienteNavigation).WithMany(p => p.Facturas)
                .HasForeignKey(d => d.Idcliente)
                .HasConstraintName("FK__Factura__IDClien__3C69FB99");

            entity.HasOne(d => d.IdmedicoNavigation).WithMany(p => p.Facturas)
                .HasForeignKey(d => d.Idmedico)
                .HasConstraintName("FK_Factura_Medico");
        });

        modelBuilder.Entity<Medico>(entity =>
        {
            entity.HasKey(e => e.Idmedico).HasName("PK__Medico__C65D83E64FC047CE");

            entity.ToTable("Medico");

            entity.Property(e => e.Idmedico).HasColumnName("IDMedico");
            entity.Property(e => e.Correo).HasMaxLength(75);
            entity.Property(e => e.Especialidad)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Password).HasMaxLength(50);
            entity.Property(e => e.ResetToken).HasMaxLength(50);
            entity.Property(e => e.ResetTokenExpires).HasColumnType("datetime");
            entity.Property(e => e.Rol).HasMaxLength(25);
        });

        modelBuilder.Entity<Muestra>(entity =>
        {
            entity.ToTable("Muestra");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Muestra1)
                .HasMaxLength(50)
                .HasColumnName("Muestra");
        });

        modelBuilder.Entity<Orden>(entity =>
        {
            entity.HasKey(e => e.Idorden).HasName("PK__Orden__5CBBCAD75BA8527A");

            entity.ToTable("Orden");

            entity.HasIndex(e => e.Idcliente, "idx_Orden_IDCliente");

            entity.Property(e => e.Idorden).HasColumnName("IDOrden");
            entity.Property(e => e.Estado)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasDefaultValue("Pendiente");
            entity.Property(e => e.FechaEntrega)
                .HasColumnType("datetime")
                .HasColumnName("fechaEntrega");
            entity.Property(e => e.FechaOrden)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Idcliente).HasColumnName("IDCliente");
            entity.Property(e => e.Idmedico).HasColumnName("IDMedico");

            entity.HasOne(d => d.IdclienteNavigation).WithMany(p => p.Ordens)
                .HasForeignKey(d => d.Idcliente)
                .HasConstraintName("FK__Orden__IDCliente__2C3393D0");

            entity.HasOne(d => d.IdmedicoNavigation).WithMany(p => p.Ordens)
                .HasForeignKey(d => d.Idmedico)
                .HasConstraintName("FK__Orden__IDMedico__2D27B809");
        });

        modelBuilder.Entity<Parametro>(entity =>
        {
            entity.HasKey(e => e.Idparametro).HasName("PK__Parametr__2FB9810E78D9F4BB");

            entity.ToTable("Parametro");

            entity.Property(e => e.Idparametro).HasColumnName("IDParametro");
            entity.Property(e => e.IdtipoExamen).HasColumnName("IDTipoExamen");
            entity.Property(e => e.NombreParametro)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.OpcionesFijas).HasMaxLength(200);
            entity.Property(e => e.UnidadMedida)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ValorReferencia)
                .HasMaxLength(100)
                .IsUnicode(false);

            entity.HasOne(d => d.IdtipoExamenNavigation).WithMany(p => p.Parametros)
                .HasForeignKey(d => d.IdtipoExamen)
                .HasConstraintName("FK__Parametro__IDTip__45F365D3");
        });

        modelBuilder.Entity<ResultadoExaman>(entity =>
        {
            entity.HasKey(e => e.Idresultado).HasName("PK__Resultad__CA8EAAD7695AE3D3");

            entity.HasIndex(e => e.IddetalleOrden, "idx_ResultadoExamen_IDDetalleOrden");

            entity.Property(e => e.Idresultado).HasColumnName("IDResultado");
            entity.Property(e => e.FechaResultado)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.IddetalleOrden).HasColumnName("IDDetalleOrden");
            entity.Property(e => e.Idparametro).HasColumnName("IDParametro");
            entity.Property(e => e.NombreParametro).HasMaxLength(75);
            entity.Property(e => e.Resultado)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IddetalleOrdenNavigation).WithMany(p => p.ResultadoExamen)
                .HasForeignKey(d => d.IddetalleOrden)
                .HasConstraintName("FK__Resultado__IDDet__37A5467C");

            entity.HasOne(d => d.IdparametroNavigation).WithMany(p => p.ResultadoExamen)
                .HasForeignKey(d => d.Idparametro)
                .HasConstraintName("FK__Resultado__IDPar__47DBAE45");
        });

        modelBuilder.Entity<TipoExaman>(entity =>
        {
            entity.HasKey(e => e.IdtipoExamen).HasName("PK__TipoExam__F52A43F0A48ECEF8");

            entity.Property(e => e.IdtipoExamen).HasColumnName("IDTipoExamen");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.NombreExamen)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Precio).HasColumnType("decimal(10, 2)");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
