using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class DetalleOrden
{
    public int IddetalleOrden { get; set; }

    public int? Idorden { get; set; }

    public int? IdtipoExamen { get; set; }

    public int? Idmuestra { get; set; }

    public virtual ICollection<DetalleFactura> DetalleFacturas { get; set; } = new List<DetalleFactura>();

    public virtual Muestra IdmuestraNavigation { get; set; } = null!;

    public virtual Orden? IdordenNavigation { get; set; }

    public virtual TipoExaman? IdtipoExamenNavigation { get; set; }

    public virtual ICollection<ResultadoExaman> ResultadoExamen { get; set; } = new List<ResultadoExaman>();
}
