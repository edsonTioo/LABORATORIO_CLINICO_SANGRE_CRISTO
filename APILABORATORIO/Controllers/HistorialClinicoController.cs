using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using APILABORATORIO.Models;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HistorialClinicoController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public HistorialClinicoController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Obtiene el historial clínico completo de un cliente por nombre
        /// </summary>
        /// <param name="nombre">Nombre o parte del nombre del cliente</param>
        /// <returns>Historial clínico con órdenes, exámenes y resultados</returns>
        [HttpGet("por-nombre")]
        public async Task<ActionResult<IEnumerable<object>>> GetHistorialPorNombre([FromQuery] string nombre)
        {
            if (string.IsNullOrWhiteSpace(nombre) || nombre.Length < 3)
            {
                return BadRequest("Debe proporcionar al menos 3 caracteres para la búsqueda");
            }

            var clientes = await _context.Clientes
                .Where(c => c.Nombre.Contains(nombre))
                .Include(c => c.Ordens)
                    .ThenInclude(o => o.IdmedicoNavigation)
                .Include(c => c.Ordens)
                    .ThenInclude(o => o.DetalleOrdens)
                        .ThenInclude(d => d.IdtipoExamenNavigation)
                .Include(c => c.Ordens)
                    .ThenInclude(o => o.DetalleOrdens)
                        .ThenInclude(d => d.IdmuestraNavigation)
                .Include(c => c.Ordens)
                    .ThenInclude(o => o.DetalleOrdens)
                        .ThenInclude(d => d.ResultadoExamen)
                            .ThenInclude(r => r.IdparametroNavigation)
                .ToListAsync();

            if (!clientes.Any())
            {
                return NotFound("No se encontraron clientes con ese nombre");
            }

            var historial = clientes.Select(c => new
            {
                Cliente = new
                {
                    c.Idcliente,
                    c.Nombre,
                    c.Genero,
                    c.Telefono,
                },
                Ordenes = c.Ordens.Select(o => new
                {
                    o.Idorden,
                    o.FechaOrden,
                    o.Estado,
                    Medico = o.IdmedicoNavigation != null ? new
                    {
                        o.IdmedicoNavigation.Nombre,
                        o.IdmedicoNavigation.Especialidad
                    } : null,
                    Detalles = o.DetalleOrdens.Select(d => new
                    {
                        d.IddetalleOrden,
                        Examen = new
                        {
                            d.IdtipoExamenNavigation.IdtipoExamen,
                            d.IdtipoExamenNavigation.NombreExamen,
                            d.IdtipoExamenNavigation.Descripcion,
                            d.IdtipoExamenNavigation.Precio
                        },
                        Muestra = d.IdmuestraNavigation?.Muestra1,
                        Resultados = d.ResultadoExamen.Select(r => new
                        {
                            r.Idresultado,
                            r.FechaResultado,
                            Parametro = r.IdparametroNavigation != null ? new
                            {
                                r.IdparametroNavigation.Idparametro,
                                r.IdparametroNavigation.NombreParametro,
                                r.IdparametroNavigation.UnidadMedida,
                                r.IdparametroNavigation.ValorReferencia
                            } : null,
                            r.NombreParametro,
                            r.Resultado,
                            Interpretacion = InterpretarResultado(r.Resultado, r.IdparametroNavigation?.ValorReferencia)
                        })
                    })
                }).OrderByDescending(o => o.FechaOrden)
            });

            return Ok(historial);
        }

        private string InterpretarResultado(string resultado, string valorReferencia)
        {
            if (string.IsNullOrWhiteSpace(valorReferencia) || string.IsNullOrWhiteSpace(resultado))
                return "No aplica";

            // Intentar parsear el resultado como número
            if (decimal.TryParse(resultado, out decimal valorResultado))
            {
                // Procesar el rango de referencia (ejemplo: "10-20")
                var rangos = valorReferencia.Split('-');
                if (rangos.Length == 2)
                {
                    if (decimal.TryParse(rangos[0], out decimal min) && 
                        decimal.TryParse(rangos[1], out decimal max))
                    {
                        if (valorResultado < min)
                            return "Bajo";
                        if (valorResultado > max)
                            return "Alto";
                        return "Normal";
                    }
                }
            }

            // Para resultados no numéricos o formatos no estándar
            return "Verificar";
        }
    }
}