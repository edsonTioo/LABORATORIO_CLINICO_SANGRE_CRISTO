import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { MaterialIcons, AntDesign } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Platform } from "react-native";
import withAutoRefresh from "./withAutoRefresh";

const UpdateResultados = () => {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [examenes, setExamenes] = useState([]);
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const [parametros, setParametros] = useState([]);
  const [parametroEditando, setParametroEditando] = useState(null);
  const [nuevoValor, setNuevoValor] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [loading, setLoading] = useState(false);

  const screenWidth = Dimensions.get("window").width;
  const columnWidth = screenWidth / 3;

  const urlbase =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/"
      : "http://localhost:5090/api/";

  const fetchClientes = async () => {
    try {
      const response = await fetch(`${urlbase}Paciente`);
      const data = await response.json();
      const clientesData = Array.isArray(data) ? data : data.$values || [];

      setClientes(
        clientesData.map((cliente) => ({
          label: cliente.nombre || "Cliente sin nombre",
          value: cliente.idcliente,
          ...cliente,
        }))
      );
    } catch (error) {
      console.error("Error fetching clientes:", error);
    }
  };

  const fetchExamenesCliente = async (idCliente) => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `${urlbase}UpdateResult/conResultados?idCliente=${idCliente}`
      );
      const data = await response.json();

      const examenesData = Array.isArray(data) ? data : data.$values || [];
      const examenesProcesados = [];

      examenesData.forEach((cliente) => {
        const ordenes = Array.isArray(cliente.ordenes)
          ? cliente.ordenes
          : cliente.ordenes?.$values || [];

        ordenes.forEach((orden) => {
          const examenesOrden = Array.isArray(orden.examenes)
            ? orden.examenes
            : orden.examenes?.$values || [];

          examenesOrden.forEach((examen) => {
            examenesProcesados.push({
              idOrden: orden.idOrden || 0,
              fechaOrden: orden.fechaOrden || new Date(),
              estado: orden.estado || "Sin estado",
              idExamen: examen.idExamen || 0,
              nombreExamen: examen.nombreExamen || "Examen sin nombre",
              resultados: (Array.isArray(examen.resultados)
                ? examen.resultados
                : examen.resultados?.$values || []
              ).map((r) => ({
                ...r,
                nombreParametro: r.nombreParametro || "Parámetro sin nombre",
                resultado: r.resultado || "",
                fechaResultado: r.fechaResultado || new Date(),
                opcionesFijas: r.opcionesFijas || null,
                unidadMedida: r.unidadMedida || "",
                valorReferencia: r.valorReferencia || "",
              })),
            });
          });
        });
      });

      examenesProcesados.sort((a, b) => {
        const fechaA = new Date(a.fechaOrden);
        const fechaB = new Date(b.fechaOrden);
        return fechaB - fechaA;
      });

      setExamenes(examenesProcesados);
    } catch (error) {
      console.error("Error fetching exámenes:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSeleccionCliente = (item) => {
    setClienteSeleccionado(item);
    setExamenSeleccionado(null);
    setParametros([]);
    fetchExamenesCliente(item.value);
  };

  const handleSeleccionExamen = (examen) => {
    setExamenSeleccionado(examen);
    setParametros(examen.resultados);
    setParametroEditando(null);
    setNuevoValor("");
  };

  const handleActualizarParametro = async () => {
    if (!parametroEditando) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${urlbase}UpdateResult/${parametroEditando.idResultado}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Resultado: nuevoValor,
          }),
        }
      );

      if (response.ok) {
        setParametros(
          parametros.map((p) =>
            p.idResultado === parametroEditando.idResultado
              ? { ...p, resultado: nuevoValor, fechaResultado: new Date() }
              : p
          )
        );
        setParametroEditando(null);
        setNuevoValor("");
      }
    } catch (error) {
      console.error("Error actualizando parámetro:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchClientes();
      return () => {};
    }, [])
  );

  const renderExamen = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.examenItem,
        examenSeleccionado?.idExamen === item.idExamen &&
          examenSeleccionado?.idOrden === item.idOrden &&
          styles.examenSeleccionado,
      ]}
      onPress={() => handleSeleccionExamen(item)}
    >
      <View style={styles.examenHeader}>
        <MaterialIcons name="science" size={24} color="#4cc9f0" />
        <Text style={styles.examenNombre}>{item.nombreExamen}</Text>
      </View>
      <Text style={styles.examenFecha}>
        {new Date(item.fechaOrden).toLocaleDateString()}
      </Text>
      <Text style={styles.examenEstado}>{item.estado}</Text>
    </TouchableOpacity>
  );

  const renderParametroNormal = ({ item }) => (
    <View style={styles.parametroContainer}>
      {parametroEditando?.idResultado === item.idResultado ? (
        <View style={styles.edicionContainer}>
          <Text style={styles.parametroNombre}>{item.nombreParametro}</Text>

          {item.opcionesFijas ? (
            <Dropdown
              style={styles.dropdown}
              data={item.opcionesFijas.split(",").map((o) => ({
                label: o.trim(),
                value: o.trim(),
              }))}
              placeholder="Seleccione valor"
              value={nuevoValor}
              onChange={({ value }) => setNuevoValor(value)}
              labelField="label"
              valueField="value"
              renderLeftIcon={() => (
                <MaterialIcons
                  name="arrow-drop-down"
                  size={24}
                  color="#4cc9f0"
                />
              )}
            />
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={nuevoValor}
                onChangeText={setNuevoValor}
                placeholder="Ingrese valor"
              />
            </View>
          )}

          <View style={styles.botonesEdicion}>
            <TouchableOpacity
              style={[styles.boton, styles.botonGuardar]}
              onPress={handleActualizarParametro}
              disabled={loading}
            >
              <Text style={styles.botonTexto}>
                <MaterialIcons name="check" size={20} color="white" />
                {loading ? "Guardando..." : "Guardar"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.boton, styles.botonCancelar]}
              onPress={() => setParametroEditando(null)}
              disabled={loading}
            >
              <Text style={styles.botonTexto}>
                <MaterialIcons name="close" size={20} color="white" /> Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.parametroContent}
          onPress={() => {
            setParametroEditando(item);
            setNuevoValor(item.resultado);
          }}
        >
          <View style={styles.parametroHeader}>
            <MaterialIcons name="science" size={20} color="#3498db" />
            <Text style={styles.parametroNombre}>{item.nombreParametro}</Text>
          </View>

          <Text style={styles.parametroValor}>
            {item.resultado || "No registrado"}
          </Text>

          {item.opcionesFijas && (
            <Text style={styles.parametroOpciones}>
              Opciones: {item.opcionesFijas}
            </Text>
          )}

          <View style={styles.metaInfo}>
            <MaterialIcons name="event" size={14} color="#7f8c8d" />
            <Text style={styles.metaText}>
              {new Date(item.fechaResultado).toLocaleString()}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTablaExamenesDiversos = () => {
    const muestras = parametros.filter((p) =>
      p.nombreParametro.includes("MUESTRA")
    );
    const resultados = parametros.filter((p) =>
      p.nombreParametro.includes("RESULTADO")
    );
    const examenes = parametros.filter(
      (p) =>
        !p.nombreParametro.includes("MUESTRA") &&
        !p.nombreParametro.includes("RESULTADO")
    );

    return (
      <View style={styles.fullWidthContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, { width: columnWidth }]}>
                <Text style={styles.tableHeaderText}>MUESTRA</Text>
              </View>
              <View style={[styles.tableHeaderCell, { width: columnWidth }]}>
                <Text style={styles.tableHeaderText}>EXAMEN</Text>
              </View>
              <View style={[styles.tableHeaderCell, { width: columnWidth }]}>
                <Text style={styles.tableHeaderText}>RESULTADO</Text>
              </View>
            </View>

            {muestras.map((muestra, index) => {
              const examen = examenes[index] || {};
              const resultado = resultados[index] || {};

              return (
                <View key={`row-${index}`} style={styles.tableRow}>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParametroDropdown(muestra)}
                  </View>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParametroDropdown(examen)}
                  </View>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParametroDropdown(resultado)}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderParametroDropdown = (parametro) => {
    if (!parametro) {
      return <Text style={styles.tableCellText}>-</Text>;
    }

    let opciones = [];
    if (parametro.opcionesFijas) {
      opciones = parametro.opcionesFijas.split(",").map((op) => ({
        label: op.trim(),
        value: op.trim(),
      }));
    } else {
      opciones = [
        {
          label: parametro.nombreParametro,
          value: parametro.nombreParametro,
        },
      ];
    }

    return (
      <View style={styles.dropdownOnlyContainer}>
        {parametroEditando?.idResultado === parametro.idResultado ? (
          <>
            <Dropdown
              style={styles.dropdownInput}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              data={opciones}
              maxHeight={200}
              labelField="label"
              valueField="value"
              placeholder="Seleccione"
              value={nuevoValor}
              onChange={({ value }) => setNuevoValor(value)}
            />
            <View style={styles.botonesEdicion}>
              <TouchableOpacity
                style={[styles.boton, styles.botonGuardar]}
                onPress={handleActualizarParametro}
                disabled={loading}
              >
                <Text style={styles.botonTexto}>
                  <MaterialIcons name="check" size={20} color="white" />
                  {loading ? "Guardando..." : "Guardar"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boton, styles.botonCancelar]}
                onPress={() => setParametroEditando(null)}
                disabled={loading}
              >
                <Text style={styles.botonTexto}>
                  <MaterialIcons name="close" size={20} color="white" />{" "}
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => {
              setParametroEditando(parametro);
              setNuevoValor(parametro.resultado);
            }}
          >
            <Text style={styles.tableCellText}>
              {parametro.resultado || "No registrado"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  // Función modificada para renderTablaParasitologia
  const renderTablaParasitologia = () => {
    // 1. Filtramos los parámetros necesarios por nombre
    const muestras = parametros.filter((p) =>
      p.nombreParametro.toUpperCase().includes("MUESTRA")
    );

    const resultados = parametros.filter((p) =>
      p.nombreParametro.toUpperCase().includes("RESULTADO")
    );

    // 2. Filtramos los exámenes específicos (Helicobacter y Sangre Oculta)
    const examenesEspeciales = parametros.filter((p) => {
      const nombreUpper = p.nombreParametro.toUpperCase();
      return (
        nombreUpper.includes("HELICOBACTER PYLORI") ||
        nombreUpper === "SANGRE OCULTA (FOB)"
      );
    });

    if (
      muestras.length === 0 ||
      resultados.length === 0 ||
      examenesEspeciales.length === 0
    ) {
      return null; // No mostrar tabla si no hay parámetros especiales
    }

    return (
      <View style={styles.tableOuterContainer}>
        <Text style={styles.sectionTitle}>Análisis de Parasitología</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, { width: columnWidth }]}>
                <Text style={styles.tableHeaderText}>MUESTRA</Text>
              </View>
              <View style={[styles.tableHeaderCell, { width: columnWidth }]}>
                <Text style={styles.tableHeaderText}>EXAMEN</Text>
              </View>
              <View style={[styles.tableHeaderCell, { width: columnWidth }]}>
                <Text style={styles.tableHeaderText}>RESULTADO</Text>
              </View>
            </View>

            {muestras.map((muestra, index) => {
              const examen = examenesEspeciales[index] || {};
              const resultado = resultados[index] || {};

              return (
                <View
                  key={`row-parasitologia-${index}`}
                  style={styles.tableRow}
                >
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParametroDropdown(muestra)}
                  </View>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParametroDropdown(examen)}
                  </View>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParametroDropdown(resultado)}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderParametros = () => {
    if (!examenSeleccionado) return null;

    const nombreExamenUpper = examenSeleccionado.nombreExamen.toUpperCase();

    if (
      nombreExamenUpper === "EXÁMENES DIVERSOS" ||
      nombreExamenUpper === "EXAMENES DIVERSOS"
    ) {
      return renderTablaExamenesDiversos();
    }

    // Filtramos los parámetros para Parasitología
    const parametrosNormales = parametros.filter((p) => {
      const nombreUpper = p.nombreParametro.toUpperCase();
      return (
        !nombreUpper.includes("MUESTRA") &&
        !nombreUpper.includes("RESULTADO") &&
        !nombreUpper.includes("HELICOBACTER PYLORI") &&
        nombreUpper !== "SANGRE OCULTA (FOB)"
      );
    });

    const tieneParametrosEspeciales = parametros.some((p) => {
      const nombreUpper = p.nombreParametro.toUpperCase();
      return (
        nombreUpper.includes("MUESTRA") ||
        nombreUpper.includes("RESULTADO") ||
        nombreUpper.includes("HELICOBACTER PYLORI") ||
        nombreUpper === "SANGRE OCULTA (FOB)"
      );
    });

    return (
      <View>
        {/* Parámetros normales */}
        <FlatList
          data={parametrosNormales}
          renderItem={renderParametroNormal}
          keyExtractor={(item) => item.idResultado.toString()}
          contentContainerStyle={styles.parametrosList}
          scrollEnabled={false}
        />

        {/* Tabla especial para Parasitología si tiene parámetros especiales */}
        {nombreExamenUpper === "PARASITOLOGÍA" &&
          tieneParametrosEspeciales &&
          renderTablaParasitologia()}
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Actualización de Resultados</Text>
        </View>

        <View style={styles.searchContainer}>
          <Dropdown
            style={[styles.dropdown, isFocus && { borderColor: "#4cc9f0" }]}
            placeholder="Seleccione cliente"
            data={clientes}
            search
            labelField="label"
            valueField="value"
            value={clienteSeleccionado}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={handleSeleccionCliente}
            renderLeftIcon={() => (
              <AntDesign
                name="user"
                size={20}
                color={isFocus ? "#4cc9f0" : "#7f8c8d"}
              />
            )}
          />
        </View>

        {clienteSeleccionado && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exámenes del Cliente</Text>
            <FlatList
              data={examenes}
              renderItem={renderExamen}
              keyExtractor={(item) =>
                `${item.idOrden}_${item.idExamen}_${item.fechaOrden}`
              }
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.examenesList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() =>
                    fetchExamenesCliente(clienteSeleccionado.value)
                  }
                />
              }
            />
          </View>
        )}

        {examenSeleccionado && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Parámetros: {examenSeleccionado.nombreExamen}
            </Text>
            {renderParametros()}
          </View>
        )}

        {!clienteSeleccionado && (
          <View style={styles.placeholder}>
            <MaterialIcons name="person-search" size={50} color="#bdc3c7" />
            <Text style={styles.placeholderText}>
              Seleccione un cliente para ver sus exámenes
            </Text>
          </View>
        )}

        {clienteSeleccionado && !examenSeleccionado && (
          <View style={styles.placeholder}>
            <MaterialIcons name="science" size={50} color="#bdc3c7" />
            <Text style={styles.placeholderText}>
              Seleccione un examen para ver sus parámetros
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "#2c3e50",
    alignItems: "center",
  },
  headerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  searchContainer: {
    padding: 15,
  },
  dropdown: {
    height: 50,
    borderColor: "#e0e6ed",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: "white",
  },
  section: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 10,
  },
  examenesList: {
    paddingBottom: 10,
  },
  examenItem: {
    width: 200,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examenSeleccionado: {
    borderColor: "#4cc9f0",
    borderWidth: 2,
  },
  examenHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  examenNombre: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
    color: "#2c3e50",
  },
  examenFecha: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 5,
  },
  examenEstado: {
    fontSize: 14,
    color: "#27ae60",
    fontWeight: "500",
  },
  parametrosList: {
    paddingBottom: 20,
  },
  parametroContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parametroContent: {
    padding: 5,
  },
  parametroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  parametroNombre: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
    marginLeft: 8,
  },
  parametroValor: {
    fontSize: 16,
    color: "#3498db",
    marginBottom: 5,
    paddingLeft: 28,
  },
  parametroOpciones: {
    fontSize: 12,
    color: "#7f8c8d",
    fontStyle: "italic",
    paddingLeft: 28,
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 28,
  },
  metaText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginLeft: 4,
  },
  edicionContainer: {
    padding: 5,
  },
  inputContainer: {
    marginVertical: 10,
  },
  input: {
    height: 40,
    borderColor: "#e0e6ed",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: "white",
  },
  botonesEdicion: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  boton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  botonGuardar: {
    backgroundColor: "#27ae60",
  },
  botonCancelar: {
    backgroundColor: "#e74c3c",
  },
  botonTexto: {
    color: "white",
    fontWeight: "500",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  placeholderText: {
    fontSize: 16,
    color: "#95a5a6",
    marginTop: 15,
    textAlign: "center",
  },
  // Estilos para la tabla de exámenes diversos
  fullWidthContainer: {
    flex: 1,
    width: "100%",
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginVertical: 10,
    backgroundColor: "white",
    minWidth: Dimensions.get("window").width,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2c3e50",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#3d566e",
  },
  tableHeaderText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tableCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 60,
  },
  tableCellText: {
    fontSize: 14,
    color: "#2c3e50",
  },
  dropdownOnlyContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownInput: {
    height: 40,
    width: "90%",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: "#95a5a6",
  },
  dropdownSelectedText: {
    fontSize: 14,
    color: "#2c3e50",
  },
  // Agrega estos estilos al objeto StyleSheet
  tableOuterContainer: {
    marginVertical: 15,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});

export default withAutoRefresh(UpdateResultados);
