import React, { useState, useEffect, useCallback} from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList, ScrollView, TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import Toast from "react-native-toast-message";
import { Dropdown } from 'react-native-element-dropdown';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { LinearGradient } from 'expo-linear-gradient';
import withAutoRefresh from './withAutoRefresh'; // Asegúrate de que la ruta sea correcta
const ResultadoScreen = () => {
  // Estados para la búsqueda
 // Estados para la búsqueda
 const [selectedClient, setSelectedClient] = useState(null);
 const [isFocus, setIsFocus] = useState(false);
 const [loading, setLoading] = useState(false);
 const [orderData, setOrderData] = useState(null);
 const [error, setError] = useState('');
 const [clientList, setClientList] = useState([]);
 const [loadingClients, setLoadingClients] = useState(true);
 const [refreshing, setRefreshing] = useState(false);

 // Estados para los resultados
 const [results, setResults] = useState({});
 const [submitting, setSubmitting] = useState(false);

 // URL base de tu API
 const API_URL = Platform.OS === 'android' ? "http://10.0.2.2:5090/api" : "http://localhost:5090/api";

 // Función para cargar clientes
 const fetchClientList = useCallback(async () => {
  try {
    setLoadingClients(true);
    const response = await fetch(`${API_URL}/Resultado/ClientesPendientes`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Asegurarse de manejar tanto el formato con $values como sin él
    const clients = data.$values || data || [];
    
    const formattedClients = clients.map(client => ({
      label: client.nombreCliente,
      value: client.nombreCliente,
      idCliente: client.idCliente,
      ordenes: (client.ordenesPendientes?.$values || client.ordenesPendientes || []).map(orden => ({
        idOrden: orden.idOrden,
        fechaOrden: orden.fechaOrden,
        fechaEntrega: orden.fechaEntrega,
        examenesPendientes: {
          $values: orden.examenesPendientes?.$values || orden.examenesPendientes || []
        }
      }))
    }));

    setClientList(formattedClients);
  } catch (err) {
    console.error('Error al cargar lista de clientes:', err);
    // En lugar de mostrar alerta, puedes establecer una lista vacía
    setClientList([]);
  } finally {
    setLoadingClients(false);
    setRefreshing(false);
  }
}, [API_URL]);

 // Cargar lista al inicio y al refrescar
 useEffect(() => {
   fetchClientList();
 }, [fetchClientList]);

 // Recargar al enfocar la pantalla
 useFocusEffect(
  useCallback(() => {
    setRefreshing(true);
    fetchClientList().finally(() => setRefreshing(false));
    setSelectedClient(null);
    setOrderData(null);
    setResults({});
    setError("");
  }, [fetchClientList])
);

 // Función para manejar el refresh manual
 const onRefresh = useCallback(() => {
   setRefreshing(true);
   fetchClientList();
 }, [fetchClientList]);

  // Buscar órdenes pendientes por cliente seleccionado
  const searchOrders = async () => {
    if (!selectedClient) {
      setError('Seleccione un cliente');
      return;
    }

    setLoading(true);
    setError('');
    setOrderData(null);
    setResults({});

    try {
      const response = await fetch(`${API_URL}/Resultado/${encodeURIComponent(selectedClient)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const data = await response.json();
      console.log("Datos recibidos:", data);

      const fechaEntrega = data.fechaEntrega || 
                          data.ordenesPendientes?.$values?.[0]?.fechaEntrega || 
                          'No especificada';

      const parametros = data.parametros?.$values || [];
      
      if (parametros.length > 0) {
        setOrderData({
          IDOrden: data.idOrden,
          NombreCliente: data.nombreCliente,
          FechaOrden: data.fechaOrden,
          fechaEntrega: fechaEntrega,
          parametros: parametros.map(p => ({
            IDDetalleOrden: p.idDetalleOrden,
            IDParametro: p.idParametro,
            NombreExamen: p.nombreExamen,
            NombreParametro: p.nombreParametro,
            UnidadMedida: p.unidadMedida,
            ValorReferencia: p.valorReferencia,
            OpcionesFijas: p.opcionesFijas // Asegúrate que el backend envíe este campo
          }))
        });
        
        // Inicializar resultados vacíos para cada parámetro
        const initialResults = {};
        parametros.forEach(param => {
          initialResults[param.idParametro] = '';
        });
        setResults(initialResults);
      } else {
        setError('No se encontraron parámetros pendientes para este cliente');
      }
    } catch (err) {
      setError('Error al conectar con el servidor: ' + err.message);
      console.error('Error en searchOrders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio en los resultados
  const handleResultChange = (paramId, value) => {
    setResults(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  // Enviar resultados al servidor
  const submitResults = async () => {
    setSubmitting(true);
    setRefreshing(true);
 
    try {
      // Preparar datos para enviar
      const resultsToSend = orderData.parametros.map(param => ({
        IDDetalleOrden: param.IDDetalleOrden,
        IDParametro: param.IDParametro,
        NombreParametro: param.NombreParametro,
        Resultado: results[param.IDParametro]
      }));

      const response = await fetch(`${API_URL}/Resultado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resultsToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar resultados');
      }

            Toast.show({
              type: "success",
              text1: "✅ Éxito",
              text2: "Resultados guardados correctamente",
              position: "top",
              visibilityTime: 3000,
            });
    // Limpiar el formulario después de guardar
    setOrderData(null);
    setSelectedClient(null);
    setResults({});
    // Limpiar el formulario después de guardar
    setOrderData(null);
    setSelectedClient(null);
    setResults({});
    
    // Recargar lista de clientes
    await fetchClientList();

  } catch (err) {
    Alert.alert('Error', err.message);
    console.error('Error en submitResults:', err);
  } finally {
    setSubmitting(false);
    setRefreshing(false); 
  }
};
  // Renderizar cada parámetro según si tiene opciones fijas o no
  const renderParameterItem = ({ item }) => {
    const opciones = item.OpcionesFijas 
      ? item.OpcionesFijas.split(',').map(opcion => ({
          label: opcion.trim(),
          value: opcion.trim()
        })) 
      : [];

    return (
      <View style={styles.parameterItem}>
        <View style={styles.parameterInfo}>
          <Text style={styles.parameterName}>{item.NombreParametro}</Text>
          <Text style={styles.reference}>
            Ref: {item.ValorReferencia} {item.UnidadMedida}
          </Text>
        </View>
        
        {opciones.length > 0 ? (
          <Dropdown
            style={styles.dropdownInput}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            data={opciones}
            placeholder="Seleccione"
            value={results[item.IDParametro] || null}
            onChange={({ value }) => handleResultChange(item.IDParametro, value)}
            labelField="label"
            valueField="value"
          />
        ) : (
          <TextInput
            style={styles.textInput}
            placeholder="Resultado"
            value={results[item.IDParametro] || ''}
            onChangeText={(text) => handleResultChange(item.IDParametro, text)}
            keyboardType={item.UnidadMedida ? 'numeric' : 'default'}
          />
        )}
      </View>
    );
  };

  // Agrupar parámetros por examen
  const groupParametersByExam = () => {
    if (!orderData?.parametros) return {};

    return orderData.parametros.reduce((acc, param) => {
      if (!acc[param.NombreExamen]) {
        acc[param.NombreExamen] = {
          parameters: [],
        };
      }
      acc[param.NombreExamen].parameters.push(param);
      return acc;
    }, {});
  };

 return (
    <View style={styles.container}>
      {/* Encabezado con gradiente */}
      <View style={[styles.header, { backgroundColor: '#2c3e50' }]}>
  <Text style={styles.headerText}>Laboratorio Clínico</Text>
  <Text style={styles.headerSubtext}>Registro de Resultados</Text>
</View>

      {/* Contenido principal */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Búsqueda por nombre con Dropdown */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Clientes con Órdenes Pendientes</Text>
          
          <View style={styles.spacer} />

          {loadingClients ? (
            <ActivityIndicator size="small" color="#27ae60" style={styles.loader} />
          ) : (
            <>
              <Dropdown
                style={[styles.dropdown, isFocus && { borderColor: '#27ae60', borderWidth: 2 }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={clientList}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={!isFocus ? 'Seleccione un cliente' : '...'}
                searchPlaceholder="Buscar cliente..."
                value={selectedClient}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={item => {
                  setSelectedClient(item.value);
                  setIsFocus(false);
                  setError('');
                }}
                renderLeftIcon={() => (
                  <AntDesign
                    style={styles.icon}
                    color={isFocus ? '#27ae60' : '#7f8c8d'}
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
                    {item.ordenes.map(orden => (
                      <Text key={orden.idOrden} style={styles.orderText}>
                        Orden #{orden.idOrden} - {orden.examenesPendientes.$values?.join(', ') || 'Sin exámenes'}
                      </Text>
                    ))}
                  </View>
                )}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.searchButton, (!selectedClient || loading) && styles.disabledButton]}
                  onPress={searchOrders}
                  disabled={loading || !selectedClient}
                >
                  <Text style={styles.searchButtonText}>
                    {loading ? 'Buscando...' : 'Buscar Órdenes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Indicador de carga */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#27ae60" />
            <Text style={styles.loadingText}>Cargando órdenes...</Text>
          </View>
        )}
        

        {/* Resultados de la búsqueda */}
        {orderData && (
          <View style={styles.resultsSection}>
            <View style={styles.clientInfoContainer}>
              <Text style={styles.clientName}>{orderData.NombreCliente}</Text>
              <View style={styles.orderInfoContainer}>
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>Orden #{orderData.IDOrden}</Text>
                </View>
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>
                    Emitida: {new Date(orderData.FechaOrden).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>
                    Entrega: {orderData.fechaEntrega ? new Date(orderData.fechaEntrega).toLocaleDateString() : 'No especificada'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Lista de exámenes y parámetros */}
            {Object.entries(groupParametersByExam()).map(([examName, examData]) => (
              <View key={examName} style={styles.examGroup}>
                <View style={styles.examHeader}>
                  <Text style={styles.examTitle}>{examName}</Text>
                </View>
                <FlatList
                  data={examData.parameters}
                  renderItem={renderParameterItem}
                  keyExtractor={(item) => item.IDParametro.toString()}
                  scrollEnabled={false}
                />
              </View>
            ))}
            

            {/* Botón para guardar */}
            <View style={styles.submitButton}>
              <TouchableOpacity 
                style={[styles.submitButtonStyle, submitting && styles.disabledButton]}
                onPress={submitResults}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Guardando...' : 'Guardar Resultados'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Estilos mejorados
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: 25,
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  headerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  searchSection: {
    marginHorizontal: 20,
    marginBottom: 25,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  spacer: {
    height: 15,
  },
  dropdown: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: 'white',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#95a5a6',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 8,
    color: '#2c3e50',
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
    borderBottomColor: '#eee',
  },
  textItem: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  subTextItem: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderText: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 3,
  },
  error: {
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: '#fdecea',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  buttonContainer: {
    marginTop: 10,
  },
  searchButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  loadingContainer: {
    marginVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontSize: 14,
  },
  resultsSection: {
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  clientInfoContainer: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  clientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  orderInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoBadge: {
    backgroundColor: '#e8f4f8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#d6eaf8',
  },
  infoBadgeText: {
    color: '#2980b9',
    fontSize: 13,
    fontWeight: '500',
  },
  examGroup: {
    marginTop: 20,
    marginBottom: 15,
  },
  examHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 12,
  },
  examTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
  },
  parameterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  parameterInfo: {
    flex: 1,
    marginRight: 15,
  },
  parameterName: {
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 5,
    color: '#34495e',
  },
  reference: {
    color: '#7f8c8d',
    fontSize: 13,
    fontStyle: 'italic',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    width: 100,
    textAlign: 'center',
    backgroundColor: 'white',
    color: '#2c3e50',
  },
  dropdownInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    width: 150,
    height: 40,
    backgroundColor: 'white',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#95a5a6',
  },
  dropdownSelectedText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  submitButton: {
    marginTop: 25,
    marginBottom: 10,
  },
  submitButtonStyle: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default withAutoRefresh(ResultadoScreen);