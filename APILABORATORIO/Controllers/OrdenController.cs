using APILABORATORIO.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LaboratorioClinico.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OrdenController : ControllerBase
    {

        private readonly LaboratorioClinicoContext _context;
        public OrdenController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        public class OrdenDto
        {
            public int? Idcliente { get; set; }
            public int? Idmedico { get; set; }
            public DateTime? FechaOrden { get; set; }
            public DateTime? fechaEntrega { get; set; }
            public int NumeroMuestra { get; set; }
            public List<DetalleOrdenDto> DetalleOrdens { get; set; } = new();
        }

        public class DetalleOrdenDto
        {
            public int IdtipoExamen { get; set; }
            public int Idmuestra { get; set; }
        }

        // DTO para la respuesta
        public class OrdenResponseDto
        {
            public int Idorden { get; set; }
            public int? Idcliente { get; set; }
            public int? Idmedico { get; set; }
            public DateTime? FechaOrden { get; set; }
            public DateTime? fechaEntrega { get; set; }
            public int NumeroMuestra { get; set; } 
            public string Estado { get; set; }
            public List<DetalleOrdenDto> DetalleOrdens { get; set; } = new();
        }

        // Método para crear una nueva orden con detalles
        [HttpPost]
        public async Task<IActionResult> CrearOrden([FromBody] OrdenDto ordenDto)
        {
            if (ordenDto == null || ordenDto.DetalleOrdens == null || !ordenDto.DetalleOrdens.Any())
            {
                return BadRequest("La orden y sus detalles son obligatorios.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Validación de los datos
                if (ordenDto.Idcliente == null || ordenDto.Idmedico == null)
                {
                    return BadRequest("El ID de cliente y médico son obligatorios.");
                }

                // Crear la nueva orden
                var nuevaorden = new Orden
                {
                    Idcliente = ordenDto.Idcliente,
                    Idmedico = ordenDto.Idmedico,
                    FechaOrden = ordenDto.FechaOrden,
                    FechaEntrega = ordenDto.fechaEntrega,
                    Estado = "PENDIENTE",
                    NumeroMuestra = ordenDto.NumeroMuestra,
                    DetalleOrdens = new List<DetalleOrden>()
                };

                // Guardar la orden principal
                _context.Ordens.Add(nuevaorden);
                await _context.SaveChangesAsync();

                // Asociar los detalles a la orden recién creada
                foreach (var item in ordenDto.DetalleOrdens)
                {
                    var detalle = new DetalleOrden
                    {
                        Idorden = nuevaorden.Idorden, // Asignar el ID de la orden creada
                        IdtipoExamen = item.IdtipoExamen,
                        Idmuestra = item.Idmuestra
                    };
                    nuevaorden.DetalleOrdens.Add(detalle);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var ordenResponse = new OrdenResponseDto
                {
                    Idorden = nuevaorden.Idorden,
                    Idcliente = nuevaorden.Idcliente,
                    Idmedico = nuevaorden.Idmedico,
                    FechaOrden = nuevaorden.FechaOrden,
                    fechaEntrega = nuevaorden.FechaEntrega,
                    Estado = nuevaorden.Estado,
                    NumeroMuestra = nuevaorden.NumeroMuestra,
                    DetalleOrdens = nuevaorden.DetalleOrdens.Select(d => new DetalleOrdenDto
                    {
                        IdtipoExamen = (int)d.IdtipoExamen,
                        Idmuestra = d.Idmuestra.Value
                    }).ToList()
                };

                return CreatedAtAction(nameof(ObtenerOrdenPorId), new { id = nuevaorden.Idorden }, ordenResponse);
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Error al actualizar la base de datos: {dbEx.InnerException?.Message}");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // Obtener orden por ID y proyectar a DTO
        [HttpGet("{id}")]
        public async Task<IActionResult> ObtenerOrdenPorId(int id)
        {
            var orden = await _context.Ordens
                .Include(o => o.DetalleOrdens)
                .FirstOrDefaultAsync(o => o.Idorden == id);

            if (orden == null)
            {
                return NotFound("Orden no encontrada.");
            }

            var ordenResponse = new OrdenResponseDto
            {
                Idorden = orden.Idorden,
                Idcliente = orden.Idcliente,
                Idmedico = orden.Idmedico,
                FechaOrden = orden.FechaOrden,
                fechaEntrega = orden.FechaEntrega,
                Estado = orden.Estado,
                NumeroMuestra = orden.NumeroMuestra,
                DetalleOrdens = orden.DetalleOrdens.Select(d => new DetalleOrdenDto
                {
                    IdtipoExamen = (int)d.IdtipoExamen,
                    Idmuestra = d.Idmuestra.Value
                }).ToList()
            };

            return Ok(ordenResponse);
        }

        // Método para actualizar el estado de la orden a "FACTURADO"
        [HttpPut("{id}")]
        public async Task<IActionResult> ActualizarEstadoOrden(int id)
        {
            // Buscar la orden por ID
            var orden = await _context.Ordens.FirstOrDefaultAsync(o => o.Idorden == id);

            if (orden == null)
            {
                return NotFound("Orden no encontrada.");
            }

            // Actualizar el estado a "FACTURADO"
            orden.Estado = "FACTURADO";

            try
            {
                // Guardar los cambios en la base de datos
                await _context.SaveChangesAsync();
                return Ok("El estado de la orden ha sido actualizado a 'FACTURADO'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
    }
}
