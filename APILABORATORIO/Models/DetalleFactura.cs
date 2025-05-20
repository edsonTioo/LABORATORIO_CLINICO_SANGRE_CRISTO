using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class DetalleFactura
{
    public int IddetalleFactura { get; set; }

    public int? Idfactura { get; set; }

    public int? IddetalleOrden { get; set; }

    public decimal? Subtotal { get; set; }

    public decimal? Precio { get; set; }

    public virtual DetalleOrden? IddetalleOrdenNavigation { get; set; }

    public virtual Factura? IdfacturaNavigation { get; set; }
}
