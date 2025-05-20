using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class Factura
{
    public int Idfactura { get; set; }

    public int? Idcliente { get; set; }

    public DateTime? FechaFactura { get; set; }

    public decimal? Total { get; set; }

    public int? Idmedico { get; set; }

    public virtual ICollection<DetalleFactura> DetalleFacturas { get; set; } = new List<DetalleFactura>();

    public virtual Cliente? IdclienteNavigation { get; set; }

    public virtual Medico? IdmedicoNavigation { get; set; }
}
