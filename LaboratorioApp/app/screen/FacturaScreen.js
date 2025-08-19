import React, { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Dimensions,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { DatePickerModal } from "react-native-paper-dates";
import { DataTable } from "react-native-paper";
import { format } from "date-fns";
import Toast from "react-native-toast-message";
import {
  MaterialIcons,
  FontAwesome,
  Ionicons,
  Feather,
  AntDesign,
} from "@expo/vector-icons";
import withAutoRefresh from "./withAutoRefresh";

const FacturaScreen = ({ route }) => {
  const { userData } = route.params;
  const [clientes, setClientes] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [parametros, setParametros] = useState([]);
  const [examenesCompletos, setExamenesCompletos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [parametroSeleccionado, setParametroSeleccionado] = useState(null);
  const [fechaFactura, setFechaFactura] = useState(new Date());
  const [openDate, setOpenDate] = useState(false);
  const [precio, setPrecio] = useState("");
  const [facturas, setFacturas] = useState([]);
  const [totalFactura, setTotalFactura] = useState(0);
  const [idFacturaGenerada, setIdFacturaGenerada] = useState(null);
  const [recargarClientes, setRecargarClientes] = useState(false);
  const [idTipoExamenSeleccionado, setIdTipoExamenSeleccionado] =
    useState(null);
  const [tipoFacturacion, setTipoFacturacion] = useState("PARAMETRO"); // "PARAMETRO" o "EXAMEN"
  const screenWidth = Dimensions.get("window").width;

  const imprimirFactura = () => {
    if (!idFacturaGenerada) {
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: "No hay una factura generada para imprimir.",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    const URL_REPORTE =
      Platform.OS === "android"
        ? `http://10.0.2.2:5090/api/ReporteFactura/factura/${idFacturaGenerada}`
        : `http://localhost:5090/api/ReporteFactura/factura/${idFacturaGenerada}`;

    Linking.openURL(URL_REPORTE).catch((err) => {
      console.error("Error al abrir el PDF:", err);
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: "No se pudo abrir el PDF de la factura.",
        position: "top",
        visibilityTime: 3000,
      });
    });
  };

  const reiniciarFormulario = useCallback(() => {
    setClienteSeleccionado(null);
    setOrdenSeleccionada(null);
    setParametroSeleccionado(null);
    setOrdenes([]);
    setExamenesCompletos([]);
    setFacturas([]);
    setTotalFactura(0);
    setPrecio("");
    setFechaFactura(new Date());
    setParametros([]);
    setIdTipoExamenSeleccionado(null);
    setTipoFacturacion("PARAMETRO");
  }, []);

  useFocusEffect(
    useCallback(() => {
      reiniciarFormulario();
      return () => {};
    }, [reiniciarFormulario])
  );

  const API_URL_Ordenes_Pendientes =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/Factura/clientes-con-ordenes-pendientes"
      : "http://localhost:5090/api/Factura/clientes-con-ordenes-pendientes";

  useEffect(() => {
    fetch(API_URL_Ordenes_Pendientes)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.$values)) {
          const lista = data.$values.map((item) => ({
            label: item.nombre,
            value: item.idcliente.toString(),
          }));
          setClientes(lista);
        } else {
          console.error(
            "La respuesta no contiene un arreglo de clientes:",
            data
          );
        }
      })
      .catch((error) => console.error("Error al obtener clientes:", error))
      .finally(() => setRecargarClientes(false));
  }, [recargarClientes]);

  const API_URL_ORDENES =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/Factura/examenes-pendientes"
      : "http://localhost:5090/api/Factura/examenes-pendientes";

  useEffect(() => {
    if (clienteSeleccionado) {
      fetch(`${API_URL_ORDENES}/${clienteSeleccionado}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Datos recibidos de órdenes:", data);
          if (Array.isArray(data.$values)) {
            const listaOrdenes = data.$values
              .filter((item) => item && item.iddetalleOrden)
              .map((item) => ({
                label: item.nombre || "Sin nombre",
                value: item.iddetalleOrden.toString(),
                idTipoExamen: item.idTipoExamen,
                idOrden: item.idOrden, // Asegúrate de que esto coincida con la respuesta del API
                nombreExamen: item.nombre,
                precio: item.precio,
              }));

            setOrdenes(listaOrdenes);
            console.log(listaOrdenes);

            // Para exámenes completos
            const listaExamenes = listaOrdenes.map((orden) => ({
              label: orden.nombreExamen || orden.nombre || "Examen",
              value: orden.idTipoExamen.toString(),
              precio: orden.precio,
              nombreExamen: orden.nombreExamen || orden.nombre || "Examen",
              iddetalleOrden: orden.value,
              idOrden: orden.idOrden, // Asegúrate de que esto viene del objeto orden
            }));
            setExamenesCompletos(listaExamenes);
            console.log(listaExamenes);
          }
        })
        .catch((error) => console.error("Error al obtener órdenes:", error));
    } else {
      setOrdenes([]);
      setExamenesCompletos([]);
    }
  }, [clienteSeleccionado, recargarClientes]);

  const API_URL_PARAMETROS =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/Factura/parametros-por-tipoexamen"
      : "http://localhost:5090/api/Factura/parametros-por-tipoexamen";

      useEffect(() => {
        console.log("ID Tipo Examen seleccionado:", idTipoExamenSeleccionado);
        if (idTipoExamenSeleccionado) {
          console.log(
            "Solicitando parámetros para idTipoExamen:",
            idTipoExamenSeleccionado
          );
          fetch(`${API_URL_PARAMETROS}/${idTipoExamenSeleccionado}`)
            .then((res) => {
              console.log("Respuesta recibida, status:", res.status);
              return res.json();
            })
            .then((data) => {
              console.log("Datos recibidos de parámetros:", data);
      
              const parametrosData = Array.isArray(data.$values)
                ? data.$values
                : Array.isArray(data)
                ? data
                : [];
      
              console.log("Parámetros procesados:", parametrosData);
      
              // Filtrar los parámetros que no sean MUESTRA o RESULTADO cuando el examen es EXAMENES DIVERSOS
              const listaParametros = parametrosData
                .filter((parametro) => {
                  // Obtener el nombre del examen actual para verificar si es EXAMENES DIVERSOS
                  const examenActual = ordenes.find(
                    (orden) => orden.idTipoExamen === idTipoExamenSeleccionado
                  );
                  
            // Si es PARASITOLOGÍA o EXAMENES DIVERSOS, excluir MUESTRA y RESULTADO
            if (
              examenActual?.nombreExamen?.toUpperCase() === "PARASITOLOGÍA" ||
              examenActual?.nombreExamen?.toUpperCase() === "EXÁMENES DIVERSOS"
            ) {
              return (
                parametro.nombre?.toUpperCase() !== "MUESTRA" &&
                parametro.nombre?.toUpperCase() !== "RESULTADO"
              );
            }
            // Para otros exámenes, incluir todos los parámetros
            return true;
                })
                .map((parametro) => ({
                  label: parametro.nombre,
                  value: parametro.idparametro.toString(),
                  precio: parametro.precio,
                  nombreParametro: parametro.nombre,
                }));
      
              console.log("Lista de parámetros final:", listaParametros);
              setParametros(listaParametros);
            })
            .catch((error) => {
              console.error("Error al obtener parámetros:", error);
              setParametros([]);
            });
        } else {
          setParametros([]);
        }
      }, [idTipoExamenSeleccionado, ordenes]); // Añadí ordenes como dependencia

  const onConfirmDate = ({ date }) => {
    setFechaFactura(date);
    setOpenDate(false);
  };

  const agregarDetalle = () => {
    if (!clienteSeleccionado) {
      Toast.show({
        type: "warning",
        text1: "🚫Campo requerido",
        text2: "Debe seleccionar un cliente.",
      });
      return;
    }

    if (!ordenSeleccionada) {
      Toast.show({
        type: "warning",
        text1: "🚫Campo requerido",
        text2: "Debe seleccionar una Orden o Examen.",
      });
      return;
    }

    if (tipoFacturacion === "PARAMETRO" && !parametroSeleccionado) {
      Toast.show({
        type: "warning",
        text1: "🚫Campo requerido",
        text2: "Debe seleccionar un parámetro.",
      });
      return;
    }

    if (!fechaFactura) {
      Toast.show({
        type: "warning",
        text1: "🚫Campo requerido",
        text2: "Debe seleccionar una fecha.",
      });
      return;
    }

    if (!precio || isNaN(precio) || parseFloat(precio) <= 0) {
      Toast.show({
        type: "warning",
        text1: "🚫Precio inválido",
        text2: "Ingrese un precio válido mayor a 0.",
      });
      return;
    }

    const clienteObj = clientes.find(
      (cliente) => cliente.value === clienteSeleccionado
    );
    const nombreCliente = clienteObj
      ? clienteObj.label
      : "Cliente no encontrado";
    const subtotal = parseFloat(precio);

    let nuevoDetalle;

    if (tipoFacturacion === "PARAMETRO") {
      const ordenSeleccionadaObj = ordenes.find(
        (orden) => orden.value === ordenSeleccionada
      );
      const parametroSeleccionadoObj = parametros.find(
        (parametro) => parametro.value === parametroSeleccionado
      );

      if (!ordenSeleccionadaObj || !parametroSeleccionadoObj) {
        Toast.show({
          type: "warning",
          text1: "🚫Datos no válidos",
          text2: "Orden o parámetro seleccionado no válido.",
        });
        return;
      }

      const examenExistente = facturas.find(
        (detalle) =>
          detalle.orden === ordenSeleccionada &&
          detalle.parametro === parametroSeleccionado
      );

      if (examenExistente) {
        Toast.show({
          type: "warning",
          text1: "❌Parámetro duplicado",
          text2: "Este parámetro ya ha sido agregado para esta orden.",
        });
        return;
      }

      nuevoDetalle = {
        idcliente: clienteSeleccionado,
        nombre: nombreCliente,
        orden: ordenSeleccionada,
        parametro: parametroSeleccionado,
        precio: subtotal,
        subtotal: subtotal,
        fecha: format(fechaFactura, "yyyy-MM-dd"),
        idorden: ordenSeleccionadaObj.idOrden, // Asegúrate de que esto esté correcto
        nombreExamen:
          ordenSeleccionadaObj.nombreExamen ||
          ordenSeleccionadaObj.label ||
          "Tipo no disponible",
        nombreParametro:
          parametroSeleccionadoObj.nombreParametro ||
          parametroSeleccionadoObj.label ||
          "Parámetro",
        tipo: "PARAMETRO",
        idparametro: parametroSeleccionadoObj.value,
        idtipoExamen: ordenSeleccionadaObj.idTipoExamen,
      };
    } else {
      const examenSeleccionadoObj = examenesCompletos.find(
        (examen) => examen.iddetalleOrden === ordenSeleccionada
      );

      if (!examenSeleccionadoObj) {
        Toast.show({
          type: "warning",
          text1: "🚫Datos no válidos",
          text2: "Examen seleccionado no válido.",
        });
        return;
      }

      const examenExistente = facturas.find(
        (detalle) =>
          detalle.orden === ordenSeleccionada && detalle.tipo === "EXAMEN"
      );

      if (examenExistente) {
        Toast.show({
          type: "warning",
          text1: "❌Examen duplicado",
          text2: "Este examen ya ha sido agregado.",
        });
        return;
      }



// En la parte de examen completo:
nuevoDetalle = {
  idcliente: clienteSeleccionado,
  nombre: nombreCliente,
  orden: ordenSeleccionada,
  precio: subtotal,
  subtotal: subtotal,
  fecha: format(fechaFactura, "yyyy-MM-dd"),
  idorden: examenSeleccionadoObj.idOrden || examenSeleccionadoObj.idorden,
  nombreExamen: examenSeleccionadoObj.nombreExamen || examenSeleccionadoObj.label || "Examen",
  nombreParametro: examenSeleccionadoObj.nombreExamen || examenSeleccionadoObj.label || "Examen", // Cambiado de "Examen completo" al nombre real
  tipo: "EXAMEN",
  idtipoExamen: examenSeleccionadoObj.value,
};
    }

    setFacturas([...facturas, nuevoDetalle]);
    setTotalFactura((prev) => prev + subtotal);
    setParametroSeleccionado(null);
    setPrecio("");
  };

  const eliminarDetalle = (index) => {
    const nuevasFacturas = [...facturas];
    const eliminado = nuevasFacturas.splice(index, 1)[0];
    setFacturas(nuevasFacturas);
    setTotalFactura((prev) => prev - eliminado.subtotal);
    Toast.show({
      type: "error",
      text1: "❌Detalle eliminado",
      text2: `Se eliminó ${
        eliminado.tipo === "EXAMEN" ? "el examen" : "el parámetro"
      } "${eliminado.nombreParametro}" correctamente.`,
    });
  };

  const guardarFactura = () => {
      // Resetear el ID de factura al inicio
  setIdFacturaGenerada(null);
    if (facturas.length === 0) {
      Toast.show({
        type: "error",
        text1: "🚫 No hay detalles",
        text2: "Agrega al menos un item para guardar la factura.",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    console.log("Preparando datos para guardar factura...");
    const factura = {
      idcliente: parseInt(clienteSeleccionado),
      idmedico: userData.idMedico || userData.userId,
      fechaFactura: format(fechaFactura, "yyyy-MM-dd"),
      total: totalFactura,
      tipoFacturacion: tipoFacturacion,
      detalleFacturas: facturas.map((detalle) => ({
        iddetalleOrden: parseInt(detalle.orden),
        precio: detalle.precio,
        subtotal: detalle.subtotal,
        nombre: detalle.tipo === "EXAMEN" 
          ? detalle.nombreExamen 
          : detalle.nombreParametro, // Usa nombreExamen para exámenes completos
        tipo: detalle.tipo,
        idparametro: detalle.idparametro ? parseInt(detalle.idparametro) : null,
        idtipoExamen: detalle.idtipoExamen ? parseInt(detalle.idtipoExamen) : null,
      })),
    };

    console.log("Datos de la factura a enviar:", factura);

    const URL_FACTURA =
      Platform.OS === "android"
        ? "http://10.0.2.2:5090/api/Factura"
        : "http://localhost:5090/api/Factura";

    fetch(URL_FACTURA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(factura),
    })
      .then(async (res) => {
        console.log("Respuesta del servidor recibida, status:", res.status);
        const contentType = res.headers.get("Content-Type");
        const text = await res.text();

        if (contentType && contentType.includes("application/json")) {
          try {
            const jsonData = JSON.parse(text);
            console.log("Respuesta JSON del servidor:", jsonData);
            return jsonData;
          } catch (err) {
            console.error("Error al parsear JSON:", err);
            throw new Error(`Respuesta no válida del servidor: ${text}`);
          }
        } else {
          console.log("Respuesta de texto del servidor:", text);
          return text;
        }
      })
      .then((data) => {
        console.log("Procesando respuesta del servidor:", data);
      
        let nuevoIdFactura = null;
      
        if (typeof data === "object") {
          if (data.idfactura !== undefined) {
            nuevoIdFactura = data.idfactura;
          } else if (data.idFactura !== undefined) {
            nuevoIdFactura = data.idFactura;
          }
        } else if (typeof data === "string") {
          const match = data.match(/Factura generada con ID: (\d+)/);
          if (match && match[1]) {
            nuevoIdFactura = parseInt(match[1]);
          }
        }
      
        if (nuevoIdFactura) {
          setIdFacturaGenerada(nuevoIdFactura);
          setRecargarClientes(true);
      
          const idOrden = facturas[0]?.idorden;
          if (idOrden) {
            actualizarEstadoOrden(idOrden);
          }
      
          Toast.show({
            type: "success",
            text1: "✅ Factura guardada",
            text2: `Factura #${nuevoIdFactura} creada correctamente.`,
            position: "top",
            visibilityTime: 3000,
          });
      
          reiniciarFormulario();
          return;
        }

        if (typeof data === "object" && data.idFactura !== undefined) {
          console.log("Respuesta contiene idFactura:", data.idFactura);
          setIdFacturaGenerada(data.idFactura);

          const idOrden = facturas[0]?.idorden;
          if (idOrden) {
            actualizarEstadoOrden(idOrden);
          }

          Toast.show({
            type: "success",
            text1: "✅ Factura guardada",
            text2: `Factura #${data.idFactura} creada correctamente.`,
            position: "top",
            visibilityTime: 3000,
          });

          reiniciarFormulario();
          return;
        }

        if (typeof data === "string") {
          console.log("Respuesta es texto:", data);
          if (data.includes("El estado de la orden ha sido actualizado")) {
            const match = data.match(/Factura generada con ID: (\d+)/);
            console.log("Resultado de la búsqueda del ID:", match);
            if (match && match[1]) {
              const newId = parseInt(match[1]);
              console.log("ID de factura encontrado:", newId);
              setIdFacturaGenerada(newId);
            }
            Toast.show({
              type: "success",
              text1: "✅ Factura guardada",
              text2: "Estado de la orden actualizado a FACTURADO.",
              position: "top",
              visibilityTime: 3000,
            });
            reiniciarFormulario();
          } else {
            console.log("No se encontró el mensaje de éxito en la respuesta");
            Toast.show({
              type: "error",
              text1: "❌ Error al guardar",
              text2: "No se pudo registrar la factura.",
              position: "top",
              visibilityTime: 3000,
            });
          }
          return;
        }

        if (data.errors) {
          console.log("Errores de validación:", data.errors);
          Toast.show({
            type: "error",
            text1: "❌ Error de validación",
            text2: "Revisa los datos antes de guardar.",
            position: "top",
            visibilityTime: 3000,
          });
          return;
        }

        const idOrden = facturas[0]?.idorden;
        if (!idOrden) {
          console.error("El idorden no está disponible");
          Toast.show({
            type: "error",
            text1: "❌ Error",
            text2: "El ID de la orden no es válido.",
            position: "top",
            visibilityTime: 3000,
          });
          return;
        }

        actualizarEstadoOrden(idOrden);
      })
      .catch((err) => {
        console.error("Error en la petición:", err.message);
        Toast.show({
          type: "error",
          text1: "❌ Error inesperado",
          text2: err.message,
          position: "top",
          visibilityTime: 3000,
        });
      });
  };

  const actualizarEstadoOrden = (idOrden) => {
    console.log("Actualizando estado de la orden con ID:", idOrden);
    const URL_ORDEN =
      Platform.OS === "android"
        ? "http://10.0.2.2:5090/api/Orden"
        : "http://localhost:5090/api/Orden";

    fetch(`${URL_ORDEN}/${idOrden}`, {
      method: "PUT",
    })
      .then((res) => res.text())
      .then((updateData) => {
        console.log("Respuesta de actualización de orden:", updateData);
        if (updateData.includes("El estado de la orden ha sido actualizado")) {
          console.log("Estado de orden actualizado exitosamente");
        } else {
          console.log("No se pudo actualizar el estado de la orden");
        }
      })
      .catch((err) => {
        console.error("Error al actualizar la orden:", err);
      });
  };

  useEffect(() => {
    console.log("idFacturaGenerada ha cambiado:", idFacturaGenerada);
  }, [idFacturaGenerada]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {/* Selector de tipo de facturación */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Tipo de Facturación:</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="payment"
                size={18}
                color="#555"
                style={styles.icon}
              />
              <Dropdown
                data={[
                  { label: "Por Parámetro", value: "PARAMETRO" },
                  { label: "Por Examen Completo", value: "EXAMEN" },
                ]}
                labelField="label"
                valueField="value"
                value={tipoFacturacion}
                onChange={(item) => {
                  setTipoFacturacion(item.value);
                  setParametroSeleccionado(null);
                  setOrdenSeleccionada(null);
                  setPrecio("");
                }}
                placeholder="Seleccionar Tipo"
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
              />
            </View>
          </View>

          {/* Campo Cliente */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Cliente:</Text>
            <View style={styles.inputContainer}>
              <FontAwesome
                name="user"
                size={18}
                color="#555"
                style={styles.icon}
              />
              <Dropdown
                data={clientes}
                labelField="label"
                valueField="value"
                value={clienteSeleccionado}
                onChange={(item) => {
                  setClienteSeleccionado(item.value);
                  setOrdenSeleccionada(null);
                  setParametroSeleccionado(null);
                  setParametros([]);
                  setIdTipoExamenSeleccionado(null);
                }}
                placeholder="Seleccionar Cliente"
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                search
                searchPlaceholder="Buscar cliente..."
                inputSearchStyle={styles.searchInput}
              />
            </View>
          </View>

          {/* Campo Orden (solo para facturación por parámetro) */}
          {tipoFacturacion === "PARAMETRO" && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Orden:</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="assignment"
                  size={18}
                  color="#555"
                  style={styles.icon}
                />
                <Dropdown
                  data={ordenes}
                  labelField="label"
                  valueField="value"
                  value={ordenSeleccionada}
                  onChange={(item) => {
                    console.log("Orden seleccionada:", item);
                    setOrdenSeleccionada(item.value);
                    if (item.idTipoExamen) {
                      console.log(
                        "Estableciendo idTipoExamen:",
                        item.idTipoExamen
                      );
                      setIdTipoExamenSeleccionado(item.idTipoExamen);
                    } else {
                      console.warn(
                        "La orden seleccionada no tiene idTipoExamen"
                      );
                      setIdTipoExamenSeleccionado(null);
                    }
                    setParametroSeleccionado(null);
                    setPrecio("");
                  }}
                  placeholder="Seleccionar Orden"
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  search
                  searchPlaceholder="Buscar orden..."
                  inputSearchStyle={styles.searchInput}
                />
              </View>
            </View>
          )}

          {/* Campo Examen Completo (solo para facturación por examen) */}
          {tipoFacturacion === "EXAMEN" && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Examen Completo:</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="assignment"
                  size={18}
                  color="#555"
                  style={styles.icon}
                />
                <Dropdown
                  data={examenesCompletos}
                  labelField="label"
                  valueField="value"
                  value={ordenSeleccionada}
                  onChange={(item) => {
                    setOrdenSeleccionada(item.iddetalleOrden);
                    setPrecio(item.precio.toString());
                    setIdTipoExamenSeleccionado(item.value);
                  }}
                  placeholder="Seleccionar Examen"
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  search
                  searchPlaceholder="Buscar examen..."
                  inputSearchStyle={styles.searchInput}
                />
              </View>
            </View>
          )}

          {/* Campo Parámetro (solo para facturación por parámetro) */}
          {tipoFacturacion === "PARAMETRO" && ordenSeleccionada && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Parámetro:</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="science"
                  size={18}
                  color="#555"
                  style={styles.icon}
                />
                <Dropdown
                  data={parametros}
                  labelField="label"
                  valueField="value"
                  value={parametroSeleccionado}
                  onChange={(item) => {
                    setParametroSeleccionado(item.value);
                    setPrecio(item.precio.toString());
                  }}
                  placeholder="Seleccionar Parámetro"
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  search
                  searchPlaceholder="Buscar parámetro..."
                  inputSearchStyle={styles.searchInput}
                />
              </View>
            </View>
          )}

          {/* Campo Precio */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Precio:</Text>
            <View style={styles.inputContainer}>
              <FontAwesome
                name="money"
                size={18}
                color="#555"
                style={styles.icon}
              />
              <TextInput
                value={precio}
                editable={false}
                style={styles.input}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Campo Fecha */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Fecha:</Text>
            <TouchableOpacity
              onPress={() => setOpenDate(true)}
              style={styles.inputContainer}
            >
              <Feather
                name="calendar"
                size={18}
                color="#555"
                style={styles.icon}
              />
              <Text style={styles.dateText}>
                {format(fechaFactura, "yyyy-MM-dd")}
              </Text>
            </TouchableOpacity>
            <DatePickerModal
              locale="es"
              mode="single"
              visible={openDate}
              onDismiss={() => setOpenDate(false)}
              date={fechaFactura}
              onConfirm={onConfirmDate}
              saveLabel="Guardar"
              cancelLabel="Cancelar"
            />
          </View>

          {/* Botón Agregar */}
          <TouchableOpacity style={styles.addButton} onPress={agregarDetalle}>
            <View style={styles.buttonContent}>
              <AntDesign name="plus" size={20} color="white" />
              <Text style={styles.buttonLabel}>Agregar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tabla de detalles */}
        <ScrollView horizontal={true} style={{ flex: 1 }}>
          <DataTable style={[styles.table, { minWidth: screenWidth }]}>
            <DataTable.Header style={styles.tableHeader}>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Cliente</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Orden</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Examen</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Concepto</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Precio</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Subtotal</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Fecha</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Tipo</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.columnHeader}>
                <Text style={styles.headerTextblanco}>Acciones</Text>
              </DataTable.Title>
            </DataTable.Header>

            {facturas.map((detalle, index) => (
              <DataTable.Row key={index} style={styles.tableRow}>
                <DataTable.Cell style={styles.tableCell}>
                  {detalle.nombre}
                </DataTable.Cell>
                <DataTable.Cell style={styles.tableCell}>
                  {detalle.idorden ? detalle.idorden.toString() : "N/A"}
                </DataTable.Cell>
                <DataTable.Cell style={styles.tableCell}>
                  {detalle.tipo === "EXAMEN"
                    ? detalle.nombreExamen ||
                      detalle.nombreParametro ||
                      "Examen"
                    : detalle.nombreExamen || "Examen no disponible"}
                </DataTable.Cell>
                <DataTable.Cell style={styles.tableCell}>
                  {detalle.tipo === "EXAMEN"
                    ? "Examen completo"
                    : detalle.nombreParametro || "Parámetro"}
                </DataTable.Cell>
                <DataTable.Cell style={styles.tableCell}>
                  {detalle.precio.toFixed(2)}
                </DataTable.Cell>
                <DataTable.Cell style={styles.tableCell}>
                  {detalle.subtotal.toFixed(2)}
                </DataTable.Cell>
                <DataTable.Cell style={styles.tableCell}>
                  {detalle.fecha}
                </DataTable.Cell>
                <DataTable.Cell style={styles.tableCell}>
                  <Text
                    style={[
                      styles.tipoText,
                      {
                        color:
                          detalle.tipo === "EXAMEN" ? "#2ecc71" : "#3498db",
                      },
                    ]}
                  >
                    {detalle.tipo === "EXAMEN" ? "Examen" : "Parámetro"}
                  </Text>
                </DataTable.Cell>
                <DataTable.Cell style={styles.tableCell}>
                  <TouchableOpacity
                    onPress={() => eliminarDetalle(index)}
                    style={styles.deleteButton}
                  >
                    <Feather name="trash-2" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </DataTable.Cell>
              </DataTable.Row>
            ))}

            <DataTable.Row style={styles.totalRow}>
              <DataTable.Cell>Total</DataTable.Cell>
              <DataTable.Cell style={styles.totalCell}>
                {totalFactura.toFixed(2)}
              </DataTable.Cell>
            </DataTable.Row>
          </DataTable>
        </ScrollView>

        <TouchableOpacity style={styles.saveButton} onPress={guardarFactura}>
          <View style={styles.buttonContent}>
            <Feather name="save" size={20} color="white" />
            <Text style={styles.buttonLabel}>Guardar Factura</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {idFacturaGenerada ? (
        <TouchableOpacity
          style={styles.printButton}
          onPress={imprimirFactura}
          onLayout={() => console.log("Botón de imprimir renderizado")}
        >
          <View style={styles.buttonContent}>
            <Feather name="printer" size={20} color="white" />
            <Text style={styles.buttonLabel}>
              Imprimir Factura #{idFacturaGenerada}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2c3e50",
  },
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#34495e",
    marginBottom: 6,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#dfe6e9",
  },
  icon: {
    marginRight: 10,
    color: "#7f8c8d",
  },
  dropdown: {
    flex: 1,
    height: "100%",
    backgroundColor: "transparent",
  },
  placeholderStyle: {
    color: "#bdc3c7",
    fontSize: 15,
  },
  selectedTextStyle: {
    color: "#2c3e50",
    fontSize: 15,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#2c3e50",
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: "#2c3e50",
  },
  table: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  tableHeader: {
    backgroundColor: "#2c3e50",
  },
  columnHeader: {
    justifyContent: "center",
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  tableCell: {
    justifyContent: "center",
    paddingVertical: 12,
  },
  deleteText: {
    color: "#e74c3c",
    fontSize: 14,
  },
  totalRow: {
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
  },
  totalCell: {
    fontWeight: "bold",
    color: "#1976d2",
    fontSize: 16,
    textAlign: "center",
    flex: 1,
  },
  addButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#fde8e8",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },
  printButton: {
    backgroundColor: "#FF9800",
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
  },
  headerTextblanco: {
    color: "#ffffff",
  },
  tipoText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  searchInput: {
    height: 40,
    fontSize: 16,
  },
});

export default withAutoRefresh(FacturaScreen);
