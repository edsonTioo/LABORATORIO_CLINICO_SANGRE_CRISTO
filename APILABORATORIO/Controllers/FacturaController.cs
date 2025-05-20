using APILABORATORIO.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FacturaController : ControllerBase
    {
        public readonly LaboratorioClinicoContext _context;
        public FacturaController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        public class FacturaDto
        {
            public int Idcliente { get; set; }
            public DateTime FechaFactura { get; set; }
            public decimal Total { get; set; }
            // Agregar propiedad DetalleFacturas para recibir los detalles de la factura
            public int Idmedico {get;set;}
            public List<DetallefacturaDto> DetalleFacturas { get; set; } = new();
        }

        public class DetallefacturaDto
        {
           public int IddetalleOrden { get; set; }
            public decimal Subtotal { get; set; }
            public decimal Precio { get; set; }
        }

        public class FacturaResponseDto
        {
            public int Idfactura { get; set; }
            public int Idcliente { get; set; }
            public DateTime FechaFactura { get; set; }
            public decimal Total { get; set; }
            public int IdMedico {get;set;}
            public List<DetallefacturaDto> DetalleFacturas { get; set; } = new();
        }

        [HttpPost]
        public async Task<IActionResult> CrearFactura([FromBody] FacturaDto facturaDto)
        {
            if (facturaDto == null)
            {
                return BadRequest("La factura es obligatoria.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Validación de los datos
                if (facturaDto.Idcliente == 0 || facturaDto.FechaFactura == null || facturaDto.Total == 0)
                {
                    return BadRequest("Los datos de la factura son obligatorios.");
                }

                // Crear la factura
                var factura = new Factura
                {
                    Idcliente = facturaDto.Idcliente,
                    FechaFactura = facturaDto.FechaFactura,
                    Idmedico = facturaDto.Idmedico,
                    Total = facturaDto.Total
                };
                _context.Facturas.Add(factura);
                await _context.SaveChangesAsync();

                // Crear los detalles de la factura
                foreach (var detalle in facturaDto.DetalleFacturas)
                {
                    var detalleFactura = new DetalleFactura
                    {
                        // Por la línea correcta
                        IddetalleOrden = detalle.IddetalleOrden,

                        Idfactura = factura.Idfactura,
                        Subtotal = detalle.Subtotal,
                        Precio = detalle.Precio
                    };
                    _context.DetalleFacturas.Add(detalleFactura);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new FacturaResponseDto
                {
                    Idfactura = factura.Idfactura,
                    Idcliente = (int)factura.Idcliente,
                    FechaFactura = (DateTime)factura.FechaFactura,
                    Total = (decimal)factura.Total,
                    DetalleFacturas = facturaDto.DetalleFacturas
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [HttpGet("clientes-con-ordenes-pendientes")]
        public async Task<IActionResult> ObtenerClientesConOrdenesPendientes()
        {
            var clientes = await _context.Ordens
                .Where(o => o.Estado == "PENDIENTE")
                .Include(o => o.IdclienteNavigation)
                .Select(o => new
                {
                    o.Idcliente,
                    Nombre = o.IdclienteNavigation!.Nombre
                })
                .Distinct()
                .ToListAsync();

            return Ok(clientes);
        }
        [HttpGet("ordenes-pendientes/{idcliente}")]
        public async Task<IActionResult> ObtenerOrdenesPendientesPorCliente(int idcliente)
        {
            var ordenesPendientes = await _context.DetalleOrdens
                .Where(d => d.IdordenNavigation!.Estado == "PENDIENTE"
                            && d.IdordenNavigation.Idcliente == idcliente)
                .Include(d => d.IdtipoExamenNavigation)
                .Select(d => new
                {
                    IddetalleOrden = d.IddetalleOrden,
                    Idorden = d.IdordenNavigation.Idorden,
                    NombreExamen = d.IdtipoExamenNavigation!.NombreExamen,
                    Precio = d.IdtipoExamenNavigation.Precio

                })
                .ToListAsync();

            return Ok(ordenesPendientes);
        }

    }
}
