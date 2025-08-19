using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class Cliente
{
    public int Idcliente { get; set; }

    public string Nombre { get; set; } = null!;

    public DateOnly? FechaNacimiento { get; set; }

    public string? Genero { get; set; }

    public string? Telefono { get; set; }

    public virtual ICollection<Factura> Facturas { get; set; } = new List<Factura>();

    public virtual ICollection<Orden> Ordens { get; set; } = new List<Orden>();
}
