import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import Toast from "react-native-toast-message";
import { Dropdown } from "react-native-element-dropdown";
import { MaterialIcons, AntDesign } from "@expo/vector-icons";
import withAutoRefresh from "./withAutoRefresh";

const ResultadoScreen = () => {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [examenes, setExamenes] = useState([]);
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const [parametros, setParametros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [results, setResults] = useState({});
  const [error, setError] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);

  const API_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api"
      : "http://localhost:5090/api";

  const fetchClientes = async () => {
    try {
      setLoadingClients(true);
      setRefreshing(true);
      const response = await fetch(`${API_URL}/Resultado/ClientesPendientes`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const clientesData = data.$values || data || [];

      const formattedClients = clientesData.map((cliente) => ({
        label: cliente.nombreCliente,
        value: cliente.nombreCliente,
        idCliente: cliente.idCliente,
        ordenes: (
          cliente.ordenesPendientes?.$values ||
          cliente.ordenesPendientes ||
          []
        ).map((orden) => ({
          idOrden: orden.idOrden,
          fechaOrden: orden.fechaOrden,
          fechaEntrega: orden.fechaEntrega,
          examenesPendientes:
            orden.examenesPendientes?.$values || orden.examenesPendientes || [],
        })),
      }));

      setClientes(formattedClients);
      setError("");
    } catch (error) {
      console.error("Error fetching clientes:", error);
      setError("Error al cargar la lista de clientes");
    } finally {
      setLoadingClients(false);
      setRefreshing(false);
    }
  };

  const fetchParametrosExamen = useCallback(async () => {
    if (!examenSeleccionado || !clienteSeleccionado) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/Resultado/ParametrosPorExamen?nombreCliente=${encodeURIComponent(
          clienteSeleccionado.label
        )}&nombreExamen=${encodeURIComponent(examenSeleccionado.value)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const data = await response.json();
      const parametrosData = data.parametros?.$values || [];

      if (!parametrosData || parametrosData.length === 0) {
        throw new Error("No se encontraron parámetros para este examen");
      }

      const parametrosInicializados = parametrosData.map((p) => ({
        idResultado: `${p.idDetalleOrden}-${p.idParametro}`,
        idDetalleOrden: p.idDetalleOrden,
        idParametro: p.idParametro,
        nombreParametro: p.nombreParametro,
        resultado: "",
        opcionesFijas: p.opcionesFijas,
        unidadMedida: p.unidadMedida,
        valorReferencia: p.valorReferencia,
        nombreExamen: p.nombreExamen,
      }));

      setParametros(parametrosInicializados);

      const initialResults = {};
      parametrosData.forEach((param) => {
        initialResults[param.idParametro] = "";
      });
      setResults(initialResults);
    } catch (error) {
      console.error("Error fetching parámetros:", error);
      Alert.alert(
        "Error",
        error.message || "No se pudieron cargar los parámetros"
      );
      setParametros([]);
    } finally {
      setLoading(false);
    }
  }, [examenSeleccionado, clienteSeleccionado]);

  const handleSeleccionCliente = useCallback((item) => {
    setClienteSeleccionado(item);
    setExamenSeleccionado(null);
    setParametros([]);
    setResults({});
    setError("");

    const examenesData = [];

    (item.ordenes || []).forEach((orden) => {
      (orden.examenesPendientes || []).forEach((exam) => {
        if (!examenesData.some((e) => e.value === exam)) {
          examenesData.push({
            label: exam,
            value: exam,
            idOrden: orden.idOrden,
            fechaOrden: orden.fechaOrden,
            fechaEntrega: orden.fechaEntrega,
          });
        }
      });
    });

    examenesData.sort((a, b) => {
      const fechaA = new Date(a.fechaOrden);
      const fechaB = new Date(b.fechaOrden);
      return fechaB - fechaA;
    });

    setExamenes(examenesData);
  }, []);

  const handleSeleccionExamen = useCallback((item) => {
    setExamenSeleccionado(item);
    setParametros([]);
    setResults({});
  }, []);

  useEffect(() => {
    if (examenSeleccionado && clienteSeleccionado) {
      fetchParametrosExamen();
    }
  }, [examenSeleccionado, clienteSeleccionado, fetchParametrosExamen]);

  const handleResultChange = (paramId, value) => {
    setResults((prev) => ({
      ...prev,
      [paramId]: value,
    }));
  };

  const tieneParametroNota = useCallback(() => {
    return parametros.some(
      (param) => param.nombreParametro.trim().toUpperCase() === "NOTA"
    );
  }, [parametros]);

  const renderNotaField = () => {
    if (!tieneParametroNota()) return null;

    const parametroNota = parametros.find(
      (p) => p.nombreParametro.trim().toUpperCase() === "NOTA"
    );

    if (!parametroNota) return null;

    return (
      <View style={styles.notaContainer}>
        <View style={styles.notaHeader}>
          <MaterialIcons name="notes" size={20} color="#3498db" />
          <Text style={styles.notaTitle}>Observaciones</Text>
        </View>
        {Platform.OS === "web" ? (
          <div style={styles.webNotaWrapper}>
            <textarea
              style={styles.webNotaInput}
              placeholder="Escriba aquí las observaciones relevantes..."
              value={results[parametroNota.idParametro] || ""}
              onChange={(e) =>
                handleResultChange(parametroNota.idParametro, e.target.value)
              }
              rows={3}
            />
            <div style={styles.charCounter}>
              {results[parametroNota.idParametro]?.length || 0}/500
            </div>
          </div>
        ) : (
          <View style={styles.mobileNotaWrapper}>
            <TextInput
              style={styles.notaInput}
              multiline
              numberOfLines={3}
              placeholder="Escriba aquí las observaciones relevantes..."
              placeholderTextColor="#95a5a6"
              value={results[parametroNota.idParametro] || ""}
              onChangeText={(text) =>
                handleResultChange(parametroNota.idParametro, text)
              }
              maxLength={500}
            />
            <Text style={styles.charCounter}>
              {results[parametroNota.idParametro]?.length || 0}/500
            </Text>
          </View>
        )}
      </View>
    );
  };

  const handleGuardarResultados = async () => {
    if (!examenSeleccionado || parametros.length === 0) return;

    try {
      setLoading(true);

      const resultadosToSend = parametros.map((param) => ({
        IDDetalleOrden: param.idDetalleOrden,
        IDParametro: param.idParametro,
        NombreParametro: param.nombreParametro,
        Resultado: results[param.idParametro] || "",
      }));

      const response = await fetch(`${API_URL}/Resultado`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resultadosToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al guardar resultados");
      }

      Toast.show({
        type: "success",
        text1: "✅ Éxito",
        text2: "Resultados guardados correctamente",
        position: "top",
        visibilityTime: 3000,
      });

      setClienteSeleccionado(null);
      setExamenSeleccionado(null);
      setExamenes([]);
      setParametros([]);
      setResults({});

      await fetchClientes();
    } catch (error) {
      console.error("Error guardando resultados:", error);
      Alert.alert(
        "Error",
        error.message || "No se pudieron guardar los resultados"
      );
    } finally {
      setLoading(false);
    }
  };

  const groupParametersByExam = () => {
    if (!parametros || parametros.length === 0) return {};

    return parametros.reduce((acc, param) => {
      if (!acc[param.nombreExamen]) {
        acc[param.nombreExamen] = {
          parameters: [],
        };
      }
      acc[param.nombreExamen].parameters.push(param);
      return acc;
    }, {});
  };

  useFocusEffect(
    useCallback(() => {
      fetchClientes();
      return () => {};
    }, [])
  );

  const renderExamen = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.examenItem,
        examenSeleccionado?.value === item.value && styles.examenSeleccionado,
      ]}
      onPress={() => handleSeleccionExamen(item)}
    >
      <View style={styles.examenHeader}>
        <MaterialIcons name="science" size={24} color="#4cc9f0" />
        <Text style={styles.examenNombre}>{item.label}</Text>
      </View>
      <Text style={styles.examenFecha}>
        {new Date(item.fechaOrden).toLocaleDateString()}
      </Text>
      <Text style={styles.examenEstado}>Pendiente</Text>
    </TouchableOpacity>
  );

  const renderParameterItem = ({ item }) => {
    const opciones = item.opcionesFijas
      ? item.opcionesFijas.split(",").map((opcion, index) => ({
          label: opcion.trim(),
          value: opcion.trim(),
          uniqueKey: `${item.idParametro}-${index}-${opcion.trim()}`,
        }))
      : [];

    if (Platform.OS === "web") {
      return (
        <View style={styles.parameterItem}>
          <View style={styles.parameterInfo}>
            <Text style={styles.parameterName}>{item.nombreParametro}</Text>
            <Text style={styles.reference}>
              Ref: {item.valorReferencia} {item.unidadMedida}
            </Text>
          </View>

          {opciones.length > 0 ? (
            <select
              value={results[item.idParametro] || ""}
              onChange={(e) =>
                handleResultChange(item.idParametro, e.target.value)
              }
              style={styles.webDropdown}
            >
              <option value="">Seleccione valor</option>
              {opciones.map((opcion) => (
                <option key={opcion.uniqueKey} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          ) : (
            <TextInput
              style={styles.textInput}
              value={results[item.idParametro] || ""}
              onChangeText={(text) =>
                handleResultChange(item.idParametro, text)
              }
              placeholder="Ingrese valor"
              keyboardType={item.unidadMedida ? "numeric" : "default"}
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.parameterItem}>
        <View style={styles.parameterInfo}>
          <Text style={styles.parameterName}>{item.nombreParametro}</Text>
          <Text style={styles.reference}>
            Ref: {item.valorReferencia} {item.unidadMedida}
          </Text>
        </View>

        {opciones.length > 0 ? (
          <Dropdown
            style={styles.dropdownInput}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            data={opciones}
            maxHeight={200}
            labelField="label"
            valueField="value"
            placeholder="Seleccione"
            value={results[item.idParametro] || ""}
            onChange={(selected) =>
              handleResultChange(item.idParametro, selected.value)
            }
          />
        ) : (
          <TextInput
            style={styles.textInput}
            value={results[item.idParametro] || ""}
            onChangeText={(text) => handleResultChange(item.idParametro, text)}
            placeholder="Ingrese valor"
            keyboardType={item.unidadMedida ? "numeric" : "default"}
          />
        )}
      </View>
    );
  };

  const renderTablaExamenesDiversos = () => {
    const muestras = parametros.filter((p) =>
      p.nombreParametro.includes("MUESTRA")
    );
    const resultados = parametros.filter((p) =>
      p.nombreParametro.includes("RESULTADO")
    );
    // Cambio aquí: filtramos solo parámetros que no sean MUESTRA ni RESULTADO
    const examenes = parametros.filter(
      (p) =>
        !p.nombreParametro.includes("MUESTRA") &&
        !p.nombreParametro.includes("RESULTADO")
    );

    const columnWidth = Platform.OS === "web" ? "33.33%" : 250;

    return (
      <View style={styles.tableOuterContainer}>
        {Platform.OS !== "web" && (
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
                      {renderParameterDropdown(muestra)}
                    </View>
                    <View style={[styles.tableCell, { width: columnWidth }]}>
                      {renderParameterDropdown(examen)}
                    </View>
                    <View style={[styles.tableCell, { width: columnWidth }]}>
                      {renderParameterDropdown(resultado)}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {Platform.OS === "web" && (
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
                    {renderParameterDropdown(muestra)}
                  </View>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParameterDropdown(examen)}
                  </View>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParameterDropdown(resultado)}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderTablaParasitologia = () => {
    // 1. Filtramos los parámetros necesarios por nombre
    const muestras = parametros.filter((p) =>
      p.nombreParametro.toUpperCase().includes("MUESTRA")
    );

    const resultados = parametros.filter((p) =>
      p.nombreParametro.toUpperCase().includes("RESULTADO")
    );

    // 2. Filtramos los exámenes específicos (que no sean MUESTRA ni RESULTADO)
    const examenes = parametros.filter((p) => {
      const nombreUpper = p.nombreParametro.toUpperCase();
      return (
        !nombreUpper.includes("MUESTRA") &&
        !nombreUpper.includes("RESULTADO") &&
        (nombreUpper.includes("HELICOBACTER PYLORI") ||
          nombreUpper === "SANGRE OCULTA (FOB)") // Comparación exacta
      );
    });

    const columnWidth = Platform.OS === "web" ? "33.33%" : 250;

    return (
      <View style={styles.tableOuterContainer}>
        <Text style={styles.sectionTitle}>Análisis de Parasitología</Text>

        {Platform.OS !== "web" ? (
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
                  <View
                    key={`row-parasitologia-${index}`}
                    style={styles.tableRow}
                  >
                    <View style={[styles.tableCell, { width: columnWidth }]}>
                      {renderParameterDropdown(muestra)}
                    </View>
                    <View style={[styles.tableCell, { width: columnWidth }]}>
                      {renderParameterDropdown(examen)}
                    </View>
                    <View style={[styles.tableCell, { width: columnWidth }]}>
                      {renderParameterDropdown(resultado)}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
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
                <View
                  key={`row-parasitologia-${index}`}
                  style={styles.tableRow}
                >
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParameterDropdown(muestra)}
                  </View>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParameterDropdown(examen)}
                  </View>
                  <View style={[styles.tableCell, { width: columnWidth }]}>
                    {renderParameterDropdown(resultado)}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };
  const renderParameterDropdown = (parametro, isMultiSelect = false) => {
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

    if (Platform.OS === "web") {
      if (isMultiSelect) {
        return (
          <select
            multiple
            value={results[parametro.idParametro] || []}
            onChange={(e) => {
              const selected = Array.from(
                e.target.selectedOptions,
                (option) => option.value
              );
              handleResultChange(parametro.idParametro, selected.join(", "));
            }}
            style={styles.webMultiSelect}
          >
            {opciones.map((opcion, index) => (
              <option
                key={`${parametro.idParametro}-${index}`}
                value={opcion.value}
              >
                {opcion.label}
              </option>
            ))}
          </select>
        );
      } else {
        return (
          <select
            value={results[parametro.idParametro] || ""}
            onChange={(e) =>
              handleResultChange(parametro.idParametro, e.target.value)
            }
            style={styles.webDropdown}
          >
            <option value="">Seleccione</option>
            {opciones.map((opcion, index) => (
              <option
                key={`${parametro.idParametro}-${index}`}
                value={opcion.value}
              >
                {opcion.label}
              </option>
            ))}
          </select>
        );
      }
    }

    // Para móvil (React Native)
    if (isMultiSelect) {
      return (
        <View style={styles.multiSelectContainer}>
          {opciones.map((opcion, index) => (
            <TouchableOpacity
              key={`${parametro.idParametro}-${index}`}
              style={[
                styles.multiSelectOption,
                (results[parametro.idParametro] || "").includes(opcion.value) &&
                  styles.multiSelectOptionSelected,
              ]}
              onPress={() => {
                const current = (results[parametro.idParametro] || "").split(
                  ", "
                );
                let newValue;
                if (current.includes(opcion.value)) {
                  newValue = current
                    .filter((v) => v !== opcion.value)
                    .join(", ");
                } else {
                  newValue = [...current, opcion.value]
                    .filter(Boolean)
                    .join(", ");
                }
                handleResultChange(parametro.idParametro, newValue);
              }}
            >
              <Text style={styles.multiSelectOptionText}>{opcion.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return (
      <Dropdown
        style={styles.dropdownInput}
        placeholderStyle={styles.dropdownPlaceholder}
        selectedTextStyle={styles.dropdownSelectedText}
        data={opciones}
        maxHeight={200}
        labelField="label"
        valueField="value"
        placeholder="Seleccione"
        value={results[parametro.idParametro] || ""}
        onChange={(selected) =>
          handleResultChange(parametro.idParametro, selected.value)
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: "#2c3e50" }]}>
        <Text style={styles.headerText}>Laboratorio Clínico</Text>
        <Text style={styles.headerSubtext}>Registro de Resultados</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchClientes} />
        }
      >
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>
            Clientes con Órdenes Pendientes
          </Text>

          <View style={styles.spacer} />

          {loadingClients ? (
            <ActivityIndicator
              size="small"
              color="#27ae60"
              style={styles.loader}
            />
          ) : (
            <>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocus && { borderColor: "#27ae60", borderWidth: 2 },
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={clientes}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={!isFocus ? "Seleccione un cliente" : "..."}
                searchPlaceholder="Buscar cliente..."
                value={clienteSeleccionado?.value || null}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={handleSeleccionCliente}
                renderLeftIcon={() => (
                  <AntDesign
                    style={styles.icon}
                    color={isFocus ? "#27ae60" : "#7f8c8d"}
                    name="user"
                    size={20}
                  />
                )}
                renderItem={(item) => (
                  <View style={styles.item}>
                    <Text style={styles.textItem}>{item.label}</Text>
                    <Text style={styles.subTextItem}>
                      {item.ordenes.length} orden(es) pendiente(s)
                    </Text>
                    {item.ordenes.map((orden) => (
                      <Text key={orden.idOrden} style={styles.orderText}>
                        Orden #{orden.idOrden} -{" "}
                        {orden.examenesPendientes.join(", ") || "Sin exámenes"}
                      </Text>
                    ))}
                  </View>
                )}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          )}
        </View>

        {clienteSeleccionado && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Exámenes Pendientes</Text>
            <FlatList
              data={examenes}
              renderItem={renderExamen}
              keyExtractor={(item) => `examen-${item.idOrden}-${item.value}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.examenesList}
            />
          </View>
        )}

        {clienteSeleccionado && !examenSeleccionado && (
          <View style={styles.placeholder}>
            <MaterialIcons name="science" size={50} color="#bdc3c7" />
            <Text style={styles.placeholderText}>
              Seleccione un examen para realizar sus parámetros
            </Text>
          </View>
        )}

        {examenSeleccionado && (
          <View style={styles.resultsSection}>
            <View style={styles.clientInfoContainer}>
              <Text style={styles.clientName}>{clienteSeleccionado.label}</Text>
              <View style={styles.orderInfoContainer}>
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>
                    Examen: {examenSeleccionado.label}
                  </Text>
                </View>
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>
                    {new Date(
                      examenSeleccionado.fechaOrden
                    ).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#27ae60" />
                <Text style={styles.loadingText}>Cargando parámetros...</Text>
              </View>
            ) : parametros.length > 0 ? (
              <>
                {examenSeleccionado.label === "EXÁMENES DIVERSOS" ? (
                  renderTablaExamenesDiversos()
                ) : (
                  <>
                    {/* Mostrar primero los parámetros normales */}
                    {Object.entries(groupParametersByExam()).map(
                      ([examName, examData]) => (
                        <View key={examName} style={styles.examGroup}>
                          <View style={styles.examHeader}>
                            <Text style={styles.examTitle}>{examName}</Text>
                          </View>
                          <FlatList
                            data={examData.parameters.filter(
                              (p) =>
                                !p.nombreParametro
                                  .toUpperCase()
                                  .includes("MUESTRA") &&
                                !p.nombreParametro
                                  .toUpperCase()
                                  .includes("RESULTADO") &&
                                p.nombreParametro.toUpperCase() !==
                                  "HELICOBACTER PYLORI" &&
                                p.nombreParametro.toUpperCase() !==
                                  "SANGRE OCULTA (FOB)" &&
                                p.nombreParametro.toUpperCase() !== "NOTA"
                            )}
                            renderItem={renderParameterItem}
                            keyExtractor={(item) =>
                              `param-${item.idDetalleOrden}-${item.idParametro}`
                            }
                            scrollEnabled={false}
                          />
                        </View>
                      )
                    )}

                    {/* Mostrar la tabla de parasitología al final si es el caso */}
                    {examenSeleccionado.label === "PARASITOLOGÍA" &&
                      renderTablaParasitologia()}

                    {/* Mostrar campo de nota si existe */}
                    {renderNotaField()}
                  </>
                )}
                <TouchableOpacity
                  style={[
                    styles.submitButtonStyle,
                    loading && styles.disabledButton,
                  ]}
                  onPress={handleGuardarResultados}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? "Guardando..." : "Guardar Resultados"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noResultsText}>
                No se encontraron parámetros para este examen
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    padding: 25,
    paddingTop: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  headerText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtext: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  searchSection: {
    marginHorizontal: 20,
    marginBottom: 25,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 5,
  },
  spacer: {
    height: 15,
  },
  dropdown: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: "white",
  },
  placeholderStyle: {
    fontSize: 16,
    color: "#95a5a6",
  },
  selectedTextStyle: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "500",
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 8,
    color: "#2c3e50",
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  icon: {
    marginRight: 10,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  textItem: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "500",
  },
  subTextItem: {
    fontSize: 13,
    color: "#7f8c8d",
    marginTop: 4,
    fontStyle: "italic",
  },
  orderText: {
    fontSize: 12,
    color: "#3498db",
    marginTop: 3,
  },
  error: {
    color: "#e74c3c",
    marginBottom: 15,
    textAlign: "center",
    backgroundColor: "#fdecea",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  buttonContainer: {
    marginTop: 10,
  },
  searchButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#27ae60",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loader: {
    marginVertical: 10,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 15,
  },
  examenesList: {
    paddingBottom: 5,
  },
  examenItem: {
    width: 180,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e0e6ed",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  examenSeleccionado: {
    borderColor: "#27ae60",
    borderWidth: 2,
  },
  examenHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  examenNombre: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
    color: "#2c3e50",
  },
  examenFecha: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 5,
  },
  examenEstado: {
    fontSize: 12,
    color: "#e74c3c",
    fontWeight: "500",
  },
  resultsSection: {
    marginHorizontal: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  clientInfoContainer: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  clientName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 10,
  },
  orderInfoContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoBadge: {
    backgroundColor: "#e8f4f8",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#d6eaf8",
  },
  infoBadgeText: {
    color: "#2980b9",
    fontSize: 13,
    fontWeight: "500",
  },
  examGroup: {
    marginTop: 20,
    marginBottom: 15,
  },
  examHeader: {
    borderBottomWidth: 2,
    borderBottomColor: "#eee",
    paddingBottom: 8,
    marginBottom: 12,
  },
  examTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2c3e50",
  },
  parameterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  parameterInfo: {
    flex: 1,
    marginRight: 15,
  },
  parameterName: {
    fontWeight: "500",
    fontSize: 15,
    marginBottom: 5,
    color: "#34495e",
  },
  reference: {
    color: "#7f8c8d",
    fontSize: 13,
    fontStyle: "italic",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    width: 100,
    textAlign: "center",
    backgroundColor: "white",
    color: "#2c3e50",
  },
  dropdownInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    width: 150,
    height: 40,
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
  webDropdown: {
    borderRadius: "8px",
    border: "1px solid #ddd",
    width: "150px",
    height: "38px",
    backgroundColor: "white",
    fontSize: "14px",
    color: "#2c3e50",
    cursor: "pointer",
    lineHeight: "24px",
    boxSizing: "border-box",
  },
  submitButtonStyle: {
    backgroundColor: "#27ae60",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#27ae60",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 20,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#95a5a6",
    opacity: 0.7,
  },
  loadingContainer: {
    marginVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#7f8c8d",
    fontSize: 14,
  },
  noResultsText: {
    textAlign: "center",
    color: "#7f8c8d",
    fontStyle: "italic",
    marginVertical: 20,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#95a5a6",
    marginTop: 15,
    textAlign: "center",
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginVertical: 10,
    backgroundColor: "white",
    minWidth: Platform.OS === "web" ? "100%" : 600,
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
  },
  dropdownOnlyContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
  },
  dropdownAndroid: {
    height: 40,
    width: 180,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  wideTableContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginVertical: 15,
    backgroundColor: "white",
    overflow: Platform.OS === "web" ? "auto" : "hidden",
  },
  wideTableHeader: {
    flexDirection: "row",
    backgroundColor: "#2c3e50",
  },
  wideTableHeaderCell: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#3d566e",
  },
  wideTableHeaderText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  wideTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    minHeight: 60,
  },
  wideTableCell: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  notaContainer: {
    marginTop: 20,
    width: "100%",
  },
  notaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  notaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
  },
  // Estilos para móvil
  mobileNotaWrapper: {
    width: "100%",
    position: "relative",
  },
  notaInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    paddingBottom: 30, // Espacio para el contador
    textAlignVertical: "top",
    backgroundColor: "#f8fafc",
    fontSize: 14,
    color: "#34495e",
    minHeight: 100,
  },
  // Estilos para web
  webNotaWrapper: {
    width: "100%",
    position: "relative",
  },
  webNotaInput: {
    width: "100%",
    minHeight: "100px",
    padding: "12px",
    paddingBottom: "30px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    backgroundColor: "#f8fafc",
    fontSize: "14px",
    color: "#34495e",
    fontFamily: "inherit",
    resize: "vertical",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  },
  "webNotaInput:focus": {
    borderColor: "#3498db",
    backgroundColor: "white",
    boxShadow: "0 0 0 2px rgba(52, 152, 219, 0.2)",
  },
  charCounter: {
    position: "absolute",
    right: 12,
    bottom: 12,
    color: "#95a5a6",
    fontSize: 12,
    backgroundColor: "rgba(248, 250, 252, 0.9)",
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  // Agrega estos estilos a tu StyleSheet
  webMultiSelect: {
    borderRadius: "8px",
    border: "1px solid #ddd",
    width: "150px",
    minHeight: "38px",
    backgroundColor: "white",
    fontSize: "14px",
    color: "#2c3e50",
    cursor: "pointer",
    lineHeight: "24px",
    boxSizing: "border-box",
    padding: "5px",
  },
  multiSelectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  multiSelectOption: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f8f9fa",
  },
  multiSelectOptionSelected: {
    backgroundColor: "#3498db",
    borderColor: "#2980b9",
  },
  multiSelectOptionText: {
    fontSize: 12,
    color: "#2c3e50",
  },
  multiSelectOptionTextSelected: {
    color: "white",
  },
});

export default withAutoRefresh(ResultadoScreen);
