import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Platform } from 'react-native';
import withAutoRefresh from './withAutoRefresh';
import { ScrollView } from 'react-native-gesture-handler';
const UpdateResultados = () => {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [examenes, setExamenes] = useState([]);
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const [parametros, setParametros] = useState([]);
  const [parametroEditando, setParametroEditando] = useState(null);
  const [nuevoValor, setNuevoValor] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isFocus, setIsFocus] = useState(false);

  const urlbase = Platform.OS === "android" 
    ? "http://10.0.2.2:5090/api/" 
    : "http://localhost:5090/api/";

  // Obtener lista de clientes
  const fetchClientes = async () => {
    try {
      const response = await fetch(`${urlbase}Paciente`);
      const data = await response.json();
      const clientesData = Array.isArray(data) ? data : (data.$values || []);
      
      setClientes(clientesData.map(cliente => ({
        label: cliente.nombre,
        value: cliente.idcliente,
        ...cliente
      })));
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  // Obtener exámenes del cliente seleccionado
  const fetchExamenesCliente = async (idCliente) => {
    try {
      setRefreshing(true);
      const response = await fetch(`${urlbase}UpdateResult/conResultados?idCliente=${idCliente}`);
      const data = await response.json();
      
      const examenesData = Array.isArray(data) ? data : (data.$values || []);
      const examenesProcesados = [];

      examenesData.forEach(cliente => {
        const ordenes = Array.isArray(cliente.ordenes) ? cliente.ordenes : (cliente.ordenes?.$values || []);
        
        ordenes.forEach(orden => {
          const examenesOrden = Array.isArray(orden.examenes) ? orden.examenes : (orden.examenes?.$values || []);
          
          examenesOrden.forEach(examen => {
            examenesProcesados.push({
              idOrden: orden.idOrden,
              fechaOrden: orden.fechaOrden,
              estado: orden.estado,
              idExamen: examen.idExamen,
              nombreExamen: examen.nombreExamen,
              resultados: Array.isArray(examen.resultados) ? examen.resultados : (examen.resultados?.$values || [])
            });
          });
        });
      });

      setExamenes(examenesProcesados);
    } catch (error) {
      console.error('Error fetching exámenes:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Manejar selección de cliente
  const handleSeleccionCliente = (item) => {
    setClienteSeleccionado(item);
    setExamenSeleccionado(null);
    setParametros([]);
    fetchExamenesCliente(item.value);
  };

  // Manejar selección de examen
  const handleSeleccionExamen = (examen) => {
    setExamenSeleccionado(examen);
    setParametros(examen.resultados);
  };

  // Actualizar parámetro
  const handleActualizarParametro = async () => {
    if (!parametroEditando || !nuevoValor) return;

    try {
      const response = await fetch(`${urlbase}UpdateResult/${parametroEditando.idResultado}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Resultado: nuevoValor,
        }),
      });

      if (response.ok) {
        // Actualizar lista local de parámetros
        setParametros(parametros.map(p => 
          p.idResultado === parametroEditando.idResultado 
            ? { ...p, resultado: nuevoValor } 
            : p
        ));
        setParametroEditando(null);
        setNuevoValor('');
      }
    } catch (error) {
      console.error('Error actualizando parámetro:', error);
    }
  };

  // Cargar clientes al enfocar la pantalla
  useFocusEffect(
    React.useCallback(() => {
      fetchClientes();
      return () => {};
    }, [])
  );

  // Renderizar ítem de examen
  const renderExamen = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.examenItem, 
        examenSeleccionado?.idExamen === item.idExamen && styles.examenSeleccionado
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

  // Renderizar ítem de parámetro
  const renderParametro = ({ item }) => (
    <View style={styles.parametroContainer}>
      {parametroEditando?.idResultado === item.idResultado ? (
        <View style={styles.edicionContainer}>
          <Text style={styles.parametroNombre}>{item.nombreParametro}</Text>
          
          {item.opcionesFijas ? (
            <Dropdown
              style={styles.dropdown}
              data={item.opcionesFijas.split(',').map(o => ({ 
                label: o.trim(), 
                value: o.trim() 
              }))}
              placeholder="Seleccione valor"
              value={nuevoValor}
              onChange={({ value }) => setNuevoValor(value)}
              labelField="label"
              valueField="value"
              renderLeftIcon={() => (
                <MaterialIcons name="arrow-drop-down" size={24} color="#4cc9f0" />
              )}
            />
          ) : (
            <TextInput
              style={styles.input}
              value={nuevoValor}
              onChangeText={setNuevoValor}
              placeholder="Ingrese valor"
            />
          )}
          
          <View style={styles.botonesEdicion}>
            <TouchableOpacity 
              style={[styles.boton, styles.botonGuardar]} 
              onPress={handleActualizarParametro}
            >
              <MaterialIcons name="check" size={20} color="white" />
              <Text style={styles.botonTexto}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.boton, styles.botonCancelar]} 
              onPress={() => setParametroEditando(null)}
            >
              <MaterialIcons name="close" size={20} color="white" />
              <Text style={styles.botonTexto}>Cancelar</Text>
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
            {item.resultado || 'No registrado'}
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

return (
  <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
    {/* Header */}
    <View style={styles.header}>
      <Text style={styles.headerText}>Actualización de Resultados</Text>
    </View>

    {/* Selector de cliente */}
    <View style={styles.searchContainer}>
      {/* Dropdown aquí */}
       <Dropdown
          style={[styles.dropdown, isFocus && { borderColor: '#4cc9f0' }]}
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
              color={isFocus ? '#4cc9f0' : '#7f8c8d'}
            />
          )}
        />

    </View>

    {/* Lista de exámenes */}
    {clienteSeleccionado && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exámenes del Cliente</Text>
        <FlatList
          data={examenes}
          renderItem={renderExamen}
          keyExtractor={item => `${item.idOrden}-${item.idExamen}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.examenesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchExamenesCliente(clienteSeleccionado.value)}
            />
          }
        />
      </View>
    )}

    {/* Parámetros del examen seleccionado */}
    {examenSeleccionado && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Parámetros: {examenSeleccionado.nombreExamen}
        </Text>
        <FlatList
          data={parametros}
          renderItem={renderParametro}
          keyExtractor={item => item.idResultado.toString()}
          contentContainerStyle={styles.parametrosList}
          scrollEnabled={false} // 👈 Desactivar scroll interno
        />
      </View>
    )}

    {/* Placeholders */}
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
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#2c3e50',
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 15,
  },
  dropdown: {
    height: 50,
    borderColor: '#e0e6ed',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: 'white',
  },
  section: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  examenesList: {
    paddingBottom: 10,
  },
  examenItem: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examenSeleccionado: {
    borderColor: '#4cc9f0',
    borderWidth: 2,
  },
  examenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  examenNombre: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
    color: '#2c3e50',
  },
  examenFecha: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  examenEstado: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
  },
  parametrosList: {
    paddingBottom: 20,
  },
  parametroContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parametroContent: {
    padding: 5,
  },
  parametroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  parametroNombre: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginLeft: 8,
  },
  parametroValor: {
    fontSize: 16,
    color: '#3498db',
    marginBottom: 5,
    paddingLeft: 28,
  },
  parametroOpciones: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    paddingLeft: 28,
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 28,
  },
  metaText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  edicionContainer: {
    padding: 5,
  },
  input: {
    height: 40,
    borderColor: '#e0e6ed',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    backgroundColor: 'white',
  },
  botonesEdicion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  boton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  botonGuardar: {
    backgroundColor: '#27ae60',
  },
  botonCancelar: {
    backgroundColor: '#e74c3c',
  },
  botonTexto: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 15,
    textAlign: 'center',
  },
});

export default withAutoRefresh(UpdateResultados);