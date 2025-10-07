import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  Text,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Appbar,
  List,
  Chip,
  Divider,
  Badge,
  TextInput,
  Modal,
  Portal,
  HelperText
} from 'react-native-paper';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from "react-native-element-dropdown";
import AntDesign from 'react-native-vector-icons/AntDesign';
import Toast from 'react-native-toast-message';
import withAutoRefresh from './withAutoRefresh';
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = Platform.OS === 'android'
  ? 'http://10.0.2.2:5090/api/Ordenes'
  : 'http://localhost:5090/api/Ordenes';
const API_EXAMENES = Platform.OS === 'android'
  ? 'http://10.0.2.2:5090/api/TipoExamen'
  : 'http://localhost:5090/api/TipoExamen';

const API_MUESTRAS = Platform.OS === 'android'
  ? 'http://10.0.2.2:5090/api/Muestra'
  : 'http://localhost:5090/api/Muestra';

function GestionOrdenesScreen({ navigation }) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [examenes, setExamenes] = useState([]);
  const [muestras, setMuestras] = useState([]);
  const [nuevoDetalle, setNuevoDetalle] = useState({
    idTipoExamen: null,
    idMuestra: null
  });
  const [errors, setErrors] = useState({
    idTipoExamen: false,
    idMuestra: false
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      await Promise.all([
        cargarOrdenes(),
        cargarExamenes(),
        cargarMuestras()
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los datos iniciales'
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarOrdenes = async () => {
    try {
      const response = await fetch(`${API_BASE}/ordenes-con-detalles`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ← aquí el token
        },
      });
      if (!response.ok) throw new Error('Error al obtener órdenes');
      const data = await response.json();
      setOrdenes(Array.isArray(data) ? data : (data.$values || []));
    } catch (error) {
      console.error('Error al obtener órdenes:', error);
      throw error;
    }
  };

  const cargarExamenes = async () => {
  try {
    const response = await fetch(API_EXAMENES, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ← token también aquí
      },
    });
    if (!response.ok) throw new Error('Error al obtener exámenes');
    const data = await response.json();
    const examenesData = Array.isArray(data) ? data : (data.$values || []);
    setExamenes(examenesData.map(examen => ({
      idTipoExamen: examen.idtipoExamen,
      nombreExamen: examen.nombreExamen,
      descripcion: examen.descripcion,
      label: examen.nombreExamen,
      value: examen.idtipoExamen,
    })));
  } catch (error) {
    console.error('Error al obtener exámenes:', error);
    throw error;
  }
};

const cargarMuestras = async () => {
  try {
    const response = await fetch(API_MUESTRAS, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ← también aquí
      },
    });
    if (!response.ok) throw new Error('Error al obtener muestras');
    const data = await response.json();
    const muestrasData = Array.isArray(data) ? data : (data.$values || []);
    setMuestras(muestrasData.map(muestra => ({
      id: muestra.id,
      muestra1: muestra.muestra1,
      label: muestra.muestra1,
      value: muestra.id,
    })));
  } catch (error) {
    console.error('Error al obtener muestras:', error);
    throw error;
  }
};

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await cargarDatos();
    } catch (error) {
      console.error('Error al refrescar:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const abrirModalAgregarDetalle = (orden) => {
    if (orden.estado !== 'PENDIENTE') {
      Toast.show({
        type: 'error',
        text1: 'Acción no permitida',
        text2: `No se pueden agregar exámenes a una orden ${orden.estado.toLowerCase()}`
      });
      return;
    }

    setSelectedOrden(orden);
    setNuevoDetalle({
      idTipoExamen: null,
      idMuestra: null
    });
    setErrors({
      idTipoExamen: false,
      idMuestra: false
    });
    setModalVisible(true);
  };

  const validarCampos = () => {
    const newErrors = {
      idTipoExamen: !nuevoDetalle.idTipoExamen,
      idMuestra: !nuevoDetalle.idMuestra
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const validarExamenDuplicado = (orden, idTipoExamen) => {
    if (!orden || !idTipoExamen) return false;
  
    let detalles = [];
    
    if (Array.isArray(orden.detalles)) {
      detalles = orden.detalles;
    } else if (orden.detalles && Array.isArray(orden.detalles.$values)) {
      detalles = orden.detalles.$values;
    } else if (orden.detalles && typeof orden.detalles === 'object') {
      detalles = Object.values(orden.detalles);
    }
  
    return detalles.some(detalle => detalle.idTipoExamen === idTipoExamen);
  };

  const agregarDetalle = async () => {
    if (!validarCampos()) return;

    const examenDuplicado = validarExamenDuplicado(selectedOrden, nuevoDetalle.idTipoExamen);
    if (examenDuplicado) {
      const examenSeleccionado = examenes.find(e => e.idTipoExamen === nuevoDetalle.idTipoExamen);
      const nombreExamen = examenSeleccionado?.nombreExamen || 'Examen seleccionado';
      
      Toast.show({
        type: 'error',
        text1: 'Error: Examen duplicado',
        text2: `El examen "${nombreExamen}" ya está incluido en esta orden`,
        position: 'bottom',
        visibilityTime: 4000
      });
      
      setErrors(prev => ({ ...prev, idTipoExamen: true }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/agregar-detalle/${selectedOrden.idOrden}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ← agregado
        },
        body: JSON.stringify({
          idTipoExamen: nuevoDetalle.idTipoExamen,
          idMuestra: nuevoDetalle.idMuestra
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || errorData?.Mensaje || 'Error al agregar detalle');
      }

      const data = await response.json();
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: data.Mensaje || 'Examen agregado correctamente'
      });
      setModalVisible(false);
      await cargarOrdenes();
    } catch (error) {
      console.error('Error al agregar detalle:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'No se pudo agregar el examen'
      });
    }
  };

  const anularOrden = async (idOrden) => {
    const orden = ordenes.find(o => o.idOrden === idOrden);

    if (orden.estado !== 'PENDIENTE') {
      Toast.show({
        type: 'error',
        text1: 'Acción no permitida',
        text2: `No se puede anular una orden ${orden.estado.toLowerCase()}`
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/anular-orden/${idOrden}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ← agregado
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || errorData?.Mensaje || 'Error al anular orden');
      }

      const data = await response.json();
      setOrdenes(prevOrdenes =>
        prevOrdenes.map(orden =>
          orden.idOrden === idOrden
            ? { ...orden, estado: 'ORDEN-ANULADA' }
            : orden
        )
      );
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: data.message || data.Mensaje || 'Orden anulada correctamente'
      });
    } catch (error) {
      console.error('Error al anular orden:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'No se pudo anular la orden'
      });
    }
  };

  const eliminarDetalle = async (idDetalle, idOrden) => {
    const orden = ordenes.find(o => o.idOrden === idOrden);

    if (orden.estado !== 'PENDIENTE') {
      Toast.show({
        type: 'error',
        text1: 'Acción no permitida',
        text2: `No se pueden eliminar exámenes de una orden ${orden.estado.toLowerCase()}`
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/eliminar-detalle/${idDetalle}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ← agregado
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || errorData?.Mensaje || 'Error al eliminar detalle');
      }

      const data = await response.json();
      setOrdenes(prevOrdenes =>
        prevOrdenes.map(orden => {
          if (orden.idOrden === idOrden) {
            const nuevosDetalles = {
              ...orden.detalles,
              $values: orden.detalles.$values.filter(d => d.idDetalle !== idDetalle)
            };
            return { ...orden, detalles: nuevosDetalles };
          }
          return orden;
        })
      );
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: data.message || data.Mensaje || 'Examen eliminado correctamente'
      });
    } catch (error) {
      console.error('Error al eliminar detalle:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'No se pudo eliminar el examen'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETADO': return '#4CAF50';
      case 'ORDEN-ANULADA': return '#F44336';
      case 'PENDIENTE': return '#FFC107';
      case 'FACTURADO': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETADO': return 'Completado';
      case 'ORDEN-ANULADA': return 'Anulado';
      case 'PENDIENTE': return 'Pendiente';
      case 'FACTURADO': return 'Facturado';
      default: return status;
    }
  };



  const renderDropdownItem = (item) => {
    return (
      <View style={styles.item}>
        <Text style={styles.textItem}>{item.label}</Text>
        {(item.value === nuevoDetalle.idTipoExamen || item.value === nuevoDetalle.idMuestra) && (
          <AntDesign
            style={styles.icon}
            color="black"
            name="check"
            size={20}
          />
        )}
      </View>
    );
  };

  const ordenarOrdenes = (ordenes) => {
    const ordenPrioridad = {
      'PENDIENTE': 1,
      'FACTURADO': 2,
      'COMPLETADO': 3,
      'ORDEN-ANULADA': 4
    };

    return [...ordenes].sort((a, b) => {
      return ordenPrioridad[a.estado] - ordenPrioridad[b.estado] ||
        new Date(b.fechaOrden) - new Date(a.fechaOrden);
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6200EE']}
          />
        }
      >
        {ordenes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={60} color="#9E9E9E" />
            <Text style={styles.emptyText}>No hay órdenes registradas</Text>
            <Button
              mode="contained"
              onPress={handleRefresh}
              style={styles.refreshButton}
              labelStyle={styles.buttonLabel}
            >
              Recargar
            </Button>
          </View>
        ) : (
          ordenarOrdenes(ordenes).map((orden) => (
            <Card key={orden.idOrden} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.orderTitleContainer}>
                    <Title style={styles.orderTitle}>Orden #{orden.idOrden}</Title>
                    <Text style={styles.orderDate}>
                      {new Date(orden.fechaOrden).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <Chip
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: getStatusColor(orden.estado),
                        borderColor: getStatusColor(orden.estado)
                      }
                    ]}
                    textStyle={styles.chipText}
                  >
                    {getStatusText(orden.estado)}
                  </Chip>
                </View>

                <View style={styles.orderInfo}>
                  <View style={styles.infoRow}>
                    <Icon name="account" size={16} color="#666" />
                    <Text style={styles.infoText}>Cliente: #{orden.clienteId}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Icon name="doctor" size={16} color="#666" />
                    <Text style={styles.infoText}>Médico: #{orden.medicoId}</Text>
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.detailsHeader}>
                  <Text style={styles.sectionTitle}>Exámenes Solicitados</Text>
                  <Badge style={styles.badge}>
                    {orden.detalles?.$values?.length || 0}
                  </Badge>
                </View>

                {orden.detalles?.$values?.map((detalle) => (
                  <List.Item
                    key={detalle.idDetalle}
                    title={() => (
                      <Text style={{ color: 'black', fontSize: 16 }}>
                        {detalle.tipoExamen}
                      </Text>
                    )}
                    description={() => (
                      <Text style={{ color: 'black' }}>
                        Muestra: {detalle.muestra}
                      </Text>
                    )}
                    right={() => (
                      <View style={styles.detailRight}>
                        {orden.estado === 'PENDIENTE' && (
                          <Button
                            icon="delete"
                            mode="text"
                            onPress={() => eliminarDetalle(detalle.idDetalle, orden.idOrden)}
                            color="#F44336"
                            compact
                            style={styles.deleteButton}
                          />
                        )}
                      </View>
                    )}
                    left={() => (
                      <Icon
                        name="test-tube"
                        size={24}
                        color="#6200EE"
                        style={styles.testIcon}
                      />
                    )}
                    style={styles.listItem}
                    titleStyle={styles.listItemTitle}
                    descriptionStyle={styles.listItemDescription}
                  />
                ))}


              </Card.Content>

              <Card.Actions style={styles.cardActions}>
                {orden.estado === 'PENDIENTE' ? (
                  <>
                    <Button
                      mode="contained"
                      onPress={() => abrirModalAgregarDetalle(orden)}
                      style={styles.addButton}
                      labelStyle={styles.buttonLabel}
                      compact
                    >
                      Agregar Examen
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => anularOrden(orden.idOrden)}
                      style={styles.cancelButton}
                      labelStyle={styles.buttonLabel}
                      compact
                    >
                      Anular Orden
                    </Button>
                  </>
                ) : (
                  <View style={styles.statusMessage}>
                    <Icon
                      name={
                        orden.estado === 'COMPLETADO' ? 'check-circle' :
                          orden.estado === 'FACTURADO' ? 'file-document' :
                            'cancel'
                      }
                      size={20}
                      color={getStatusColor(orden.estado)}
                    />
                    <Text style={[
                      styles.noticeText,
                      { color: getStatusColor(orden.estado) }
                    ]}>
                      Esta orden está {getStatusText(orden.estado).toLowerCase()} y no puede ser modificada
                    </Text>
                  </View>
                )}
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Modal para agregar nuevo detalle */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Title
              title={
                <Text style={{ color: '#000' }}>
                  Agregar Examen a Orden #{selectedOrden?.idOrden}
                </Text>
              }
              titleStyle={styles.modalTitle}
              right={() => (
                <Button
                  icon="close"
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                />
              )}
            />
            <Card.Content>
              <Text style={styles.inputLabel}>Examen*</Text>
              <Dropdown
                style={[styles.dropdown, errors.idTipoExamen && styles.errorInput]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={examenes}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Buscar examen..."
                searchPlaceholder="Buscar..."
                value={nuevoDetalle.idTipoExamen}
                onChange={item => {
                  setNuevoDetalle({
                    ...nuevoDetalle,
                    idTipoExamen: item.value
                  });
                  setErrors({ ...errors, idTipoExamen: false });
                }}
                renderLeftIcon={() => (
                  <Icon name="test-tube" size={20} color="#6200EE" style={styles.dropdownIcon} />
                )}
                renderItem={renderDropdownItem}
              />
              <HelperText type="error" visible={errors.idTipoExamen}>
                Este campo es obligatorio
              </HelperText>

              <Text style={styles.inputLabel}>Muestra*</Text>
              <Dropdown
                style={[styles.dropdown, errors.idMuestra && styles.errorInput]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={muestras}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Buscar muestra..."
                searchPlaceholder="Buscar..."
                value={nuevoDetalle.idMuestra}
                onChange={item => {
                  setNuevoDetalle({
                    ...nuevoDetalle,
                    idMuestra: item.value
                  });
                  setErrors({ ...errors, idMuestra: false });
                }}
                renderLeftIcon={() => (
                  <Icon name="flask" size={20} color="#6200EE" style={styles.dropdownIcon} />
                )}
                renderItem={renderDropdownItem}
              />
              <HelperText type="error" visible={errors.idMuestra}>
                Este campo es obligatorio
              </HelperText>
            </Card.Content>
            <Card.Actions style={styles.modalActions}>
              <Button
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
                labelStyle={styles.buttonLabel}
              >
                Cancelar
              </Button>
              <Button
                onPress={agregarDetalle}
                mode="contained"
                style={styles.saveButton}
                labelStyle={styles.buttonLabel}
              >
                Guardar Examen
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2c3e50",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9E9E9E',
  },
  refreshButton: {
    marginTop: 20,
    backgroundColor: '#6200EE',
  },
  card: {
    marginBottom: 20,
    borderRadius: 8,
    elevation: 2,
    backgroundColor: 'white',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black'
  },
  statusChip: {
    height: 24,
    borderRadius: 12,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  orderInfo: {
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#E0E0E0',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black'
  },
  orderDate: {
    color: 'black',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#6200EE',
    color: 'white',
  },
  listItem: {
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 4,
    marginBottom: 4,
  },
  testIcon: {
    marginRight: 8,
    alignSelf: 'center',
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardActions: {
    justifyContent: 'flex-end',
    padding: 8,
  },
  addButton: {
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  cancelButton: {
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  buttonLabel: {
    color: 'white',
  },
  noticeText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  modalContainer: {
    padding: 20,
  },
  modalCard: {
    borderRadius: 8,
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    marginRight: 10,
  },
  dropdown: {
    height: 50,
    borderColor: '#6200EE',
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    marginTop: 5,
  },
  errorInput: {
    borderColor: '#F44336',
  },
  placeholderStyle: {
    fontSize: 16,
    color: 'black',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: 'black',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: 'black',
    marginTop: 16,
    marginBottom: 4,
  },
  modalActions: {
    justifyContent: 'flex-end',
    padding: 8,
  },
  saveButton: {
    borderRadius: 4,
    backgroundColor: '#6200EE',
    marginLeft: 8,
  },
  item: {
    padding: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textItem: {
    flex: 1,
    fontSize: 16,
    color: 'black',
  },
  icon: {
    marginRight: 5,
  },
});

export default withAutoRefresh(GestionOrdenesScreen);