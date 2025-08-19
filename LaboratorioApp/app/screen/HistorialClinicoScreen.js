import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import withAutoRefresh from './withAutoRefresh';

const HistorialClinicoScreen = () => {
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [searched, setSearched] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [isFocusCliente, setIsFocusCliente] = useState(false);
    const [printing, setPrinting] = useState(false);

    const API_URL_CLIENTE = Platform.OS === 'android'
        ? "http://10.0.2.2:5090/api/Paciente"
        : "http://localhost:5090/api/Paciente";

    const API_BASE_URL = Platform.OS === 'android'
        ? "http://10.0.2.2:5090"
        : "http://localhost:5090";

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const response = await fetch(API_URL_CLIENTE);
                const data = await response.json();
                setCliente(data);
            } catch (err) {
                console.error('Error fetching clientes:', err);
            }
        };

        fetchClientes();
    }, []);

    const clientesData = Array.isArray(cliente?.$values)
        ? cliente.$values.map(cli => ({
            value: cli.idcliente.toString(),
            label: cli.nombre,
            idCliente: cli.idcliente
        }))
        : [];

    const fetchHistorial = async () => {
        if (!selectedCliente) return;

        setLoading(true);
        setError(null);
        setSearched(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/historialclinico/por-nombre?nombre=${encodeURIComponent(selectedCliente.label)}`
            );

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            const historialArray = data?.$values ?? [];
            setHistorial(historialArray);

            const initialExpanded = {};
            historialArray.forEach((paciente, pIndex) => {
                paciente.ordenes?.$values?.forEach((orden, oIndex) => {
                    initialExpanded[`${pIndex}-${oIndex}`] = false;
                });
            });
            setExpandedOrders(initialExpanded);

        } catch (err) {
            setError('Error al cargar el historial. Verifique su conexión e intente nuevamente.');
            console.error('Error fetching data:', err);
            setHistorial([]);
        } finally {
            setLoading(false);
        }
    };

    const imprimirHistorialCompleto = async () => {
        if (!selectedCliente?.idCliente) {
            Alert.alert('Error', 'No se ha seleccionado un paciente');
            return;
        }

        setPrinting(true);
        
        try {
            const pdfUrl = `${API_BASE_URL}/api/ImprimirResultados/generar-reporte-completo/${selectedCliente.idCliente}`;
            
            const supported = await Linking.canOpenURL(pdfUrl);
            
            if (supported) {
                await Linking.openURL(pdfUrl);
            } else {
                Alert.alert(
                    'Error',
                    'No se puede abrir el PDF. Asegúrese de tener una aplicación para visualizar PDFs instalada.',
                    [{ text: 'OK' }]
                );
            }
        } catch (err) {
            Alert.alert('Error', err.message);
            console.error('Error al imprimir historial:', err);
        } finally {
            setPrinting(false);
        }
    };

    const toggleOrder = (index) => {
        setExpandedOrders(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { backgroundColor: '#2c3e50' }]}>
                <Text style={styles.headerText}>Laboratorio Clínico</Text>
                <Text style={styles.headerSubtext}>Historial Clínico</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.dropdownContainer}>
                    <Dropdown
                        style={[styles.dropdown, isFocusCliente && { borderColor: '#4cc9f0' }]}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        inputSearchStyle={styles.inputSearchStyle}
                        data={clientesData}
                        labelField="label"
                        valueField="value"
                        placeholder="Seleccione paciente"
                        searchPlaceholder="Buscar paciente..."
                        search={true}
                        value={selectedCliente}
                        onFocus={() => setIsFocusCliente(true)}
                        onBlur={() => setIsFocusCliente(false)}
                        onChange={item => {
                            setSelectedCliente(item);
                            setIsFocusCliente(false);
                        }}
                        renderLeftIcon={() => (
                            <Icon 
                                name="account-search" 
                                size={20} 
                                color={isFocusCliente ? '#4cc9f0' : '#95a5a6'} 
                                style={styles.dropdownIcon}
                            />
                        )}
                    />
                </View>
                
                <TouchableOpacity
                    onPress={fetchHistorial}
                    style={[styles.searchButton, !selectedCliente && styles.disabledButton]}
                    disabled={!selectedCliente}
                >
                    <Text style={styles.searchButtonText}>Buscar</Text>
                    <Icon name="magnify" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {selectedCliente && historial.length > 0 && (
                <>
                    <TouchableOpacity
                        onPress={imprimirHistorialCompleto}
                        style={[styles.printButton, printing && styles.disabledButton]}
                        disabled={printing}
                    >
                        <Icon name="printer" size={20} color="white" />
                        <Text style={styles.printButtonText}>
                            {printing ? "Generando PDF..." : "Imprimir Historial"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            const pdfUrl = `${API_BASE_URL}/api/ImprimirResultados/generar-reporte-completo-firma/${selectedCliente.idCliente}`;
                            Linking.openURL(pdfUrl).catch(err => console.error('Error al abrir PDF:', err));
                        }}
                        style={[styles.printButton, {backgroundColor: '#9b59b6'}]}
                    >
                        <Icon name="file-sign" size={20} color="white" />
                        <Text style={styles.printButtonText}>Historial con Firma</Text>
                    </TouchableOpacity>

                    {historial[0]?.ordenes?.$values?.[0]?.detalles?.$values?.[0]?.idDetalleOrden && (
                        <TouchableOpacity
                            onPress={() => {
                                const idDetalle = historial[0].ordenes.$values[0].detalles.$values[0].idDetalleOrden;
                                const pdfUrl = `${API_BASE_URL}/api/ImprimirResultados/generar-reporte-firma/${idDetalle}`;
                                Linking.openURL(pdfUrl).catch(err => console.error('Error al abrir PDF:', err));
                            }}
                            style={[styles.printButton, {backgroundColor: '#3498db'}]}
                        >
                            <Icon name="file-document-edit" size={20} color="white" />
                            <Text style={styles.printButtonText}>Último Examen con Firma</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4cc9f0" />
                    <Text style={styles.loadingText}>Cargando historial...</Text>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={24} color="#e74c3c" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {!loading && historial.length > 0 ? (
                <ScrollView 
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                >
                    {historial.map((paciente, pacienteIndex) => (
                        <View key={`paciente-${pacienteIndex}`} style={styles.pacienteCard}>
                            <View style={styles.pacienteHeader}>
                                <Icon name="account-circle" size={24} color="#3498db" />
                                <View style={styles.pacienteInfoContainer}>
                                    <Text style={styles.pacienteNombre}>
                                        {paciente?.cliente?.nombre || 'Nombre no disponible'}
                                    </Text>
                                    <View style={styles.pacienteDetails}>
                                        <Text style={styles.pacienteDetail}>
                                            <Icon name="phone" size={14} color="#7f8c8d" /> {paciente?.cliente?.telefono || 'N/A'}
                                        </Text>
                                        <Text style={styles.pacienteDetail}>
                                            <Icon name="gender-male-female" size={14} color="#7f8c8d" /> 
                                            {paciente?.cliente?.genero === 'M' ? 'Masculino' : 'Femenino'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {paciente.ordenes?.$values?.map((orden, ordenIndex) => (
                                <View key={`orden-${ordenIndex}`} style={styles.ordenCard}>
                                    <TouchableOpacity
                                        onPress={() => toggleOrder(`${pacienteIndex}-${ordenIndex}`)}
                                        style={styles.ordenHeader}
                                    >
                                        <View style={styles.ordenInfo}>
                                            <Text style={styles.ordenFecha}>
                                                <Icon name="calendar" size={14} color="#7f8c8d" />{' '}
                                                {orden?.fechaOrden ? new Date(orden.fechaOrden).toLocaleDateString() : 'Fecha no disponible'}
                                            </Text>
                                            <Text style={styles.ordenEstado}>
                                                <Icon name="clipboard-pulse" size={14} color="#7f8c8d" />{' '}
                                                {orden?.estado || 'N/A'} | {orden?.medico?.nombre || 'No especificado'}
                                            </Text>
                                        </View>
                                        <Icon 
                                            name={expandedOrders[`${pacienteIndex}-${ordenIndex}`] ? "chevron-up" : "chevron-down"} 
                                            size={20} 
                                            color="#7f8c8d" 
                                        />
                                    </TouchableOpacity>

                                    {expandedOrders[`${pacienteIndex}-${ordenIndex}`] && (
                                        <View style={styles.detallesContainer}>
                                            {orden.detalles?.$values?.map((detalle, detalleIndex) => (
                                                <View key={`detalle-${detalleIndex}`} style={styles.examenContainer}>
                                                    <View style={styles.examenHeader}>
                                                        <Icon name="test-tube" size={18} color="#2c3e50" />
                                                        <Text style={styles.examenNombre}>
                                                            {detalle.examen?.nombreExamen || 'Examen no disponible'}
                                                        </Text>
                                                        <Text style={styles.examenPrecio}>
                                                            ${detalle.Examen?.precio || 'N/A'}
                                                        </Text>
                                                    </View>
                                                    
                                                    <Text style={styles.examenMuestra}>
                                                        <Icon name="flask" size={14} color="#7f8c8d" />{' '}
                                                        {detalle.muestra || 'N/A'}
                                                    </Text>

                                                    {detalle.resultados?.$values?.length > 0 ? (
                                                        detalle.resultados.$values.map((resultado, resultadoIndex) => (
                                                            <View
                                                                key={`resultado-${resultadoIndex}`}
                                                                style={[
                                                                    styles.resultadoContainer,
                                                                    resultado.Interpretacion === 'Alto' && styles.highResult,
                                                                    resultado.Interpretacion === 'Bajo' && styles.lowResult
                                                                ]}
                                                            >
                                                                <View style={styles.resultadoHeader}>
                                                                    <Text style={styles.resultadoParametro}>
                                                                        {resultado.nombreParametro || 'Parámetro no disponible'}
                                                                    </Text>
                                                                    <Text style={styles.resultadoValor}>
                                                                        {resultado.resultado || 'N/A'} {resultado.parametro?.unidadMedida || ''}
                                                                    </Text>
                                                                </View>
                                                                <View style={styles.referenciaContainer}>
                                                                    <Text style={styles.resultadoReferencia}>
                                                                        Ref: {resultado.parametro?.valorReferencia || 'N/A'}
                                                                    </Text>
                                                                    <Text style={styles.resultadoInterpretacion}>
                                                                        {resultado.Interpretacion || 'N/A'}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        ))
                                                    ) : (
                                                        <View style={styles.emptyResults}>
                                                            <Icon name="alert" size={16} color="#95a5a6" />
                                                            <Text style={styles.emptyResultsText}>
                                                                No hay resultados disponibles para este examen
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            ) : (
                !loading && searched && (
                    <View style={styles.emptyContainer}>
                        <Icon name="database-remove" size={50} color="#bdc3c7" />
                        <Text style={styles.emptyText}>No se encontraron resultados</Text>
                    </View>
                )
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        padding: 25,
        paddingTop: Platform.OS === 'ios' ? 50 : 25,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'white',
        margin: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dropdownContainer: {
        flex: 1,
        marginRight: 10,
    },
    dropdown: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        backgroundColor: 'white',
    },
    dropdownIcon: {
        marginRight: 10,
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
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4cc9f0',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        shadowColor: '#4cc9f0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    searchButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
        opacity: 0.7,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3a0ca3',
        padding: 12,
        marginHorizontal: 15,
        marginBottom: 15,
        borderRadius: 10,
        shadowColor: '#3a0ca3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    printButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    loadingText: {
        marginTop: 15,
        color: '#7f8c8d',
        fontSize: 16,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fdecea',
        padding: 15,
        margin: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#e74c3c',
    },
    errorText: {
        color: '#c62828',
        fontSize: 15,
        marginLeft: 10,
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    pacienteCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    pacienteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    pacienteInfoContainer: {
        flex: 1,
        marginLeft: 10,
    },
    pacienteNombre: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 5,
    },
    pacienteDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    pacienteDetail: {
        fontSize: 13,
        color: '#7f8c8d',
        marginRight: 15,
        marginBottom: 3,
    },
    ordenCard: {
        borderWidth: 1,
        borderColor: '#e0e6ed',
        borderRadius: 10,
        marginBottom: 12,
        overflow: 'hidden',
    },
    ordenHeader: {
        backgroundColor: '#f8fafc',
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ordenInfo: {
        flex: 1,
    },
    ordenFecha: {
        fontSize: 15,
        fontWeight: '500',
        color: '#2c3e50',
        marginBottom: 3,
    },
    ordenEstado: {
        fontSize: 13,
        color: '#7f8c8d',
    },
    detallesContainer: {
        padding: 12,
    },
    examenContainer: {
        marginBottom: 15,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    examenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    examenNombre: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        flex: 1,
        marginLeft: 8,
    },
    examenPrecio: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#27ae60',
        marginLeft: 10,
    },
    examenMuestra: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 10,
        marginLeft: 26,
    },
    resultadoContainer: {
        marginBottom: 10,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
    },
    highResult: {
        backgroundColor: '#fdecea',
        borderLeftWidth: 4,
        borderLeftColor: '#e74c3c',
    },
    lowResult: {
        backgroundColor: '#e8f4f8',
        borderLeftWidth: 4,
        borderLeftColor: '#3498db',
    },
    resultadoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    resultadoParametro: {
        fontSize: 15,
        fontWeight: '500',
        color: '#34495e',
    },
    resultadoValor: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    referenciaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    resultadoReferencia: {
        fontSize: 13,
        color: '#7f8c8d',
    },
    resultadoInterpretacion: {
        fontSize: 13,
        fontWeight: '500',
    },
    emptyResults: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        marginTop: 5,
    },
    emptyResultsText: {
        fontSize: 14,
        color: '#95a5a6',
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 17,
        color: '#bdc3c7',
        marginTop: 15,
        textAlign: 'center',
    },
});

export default withAutoRefresh(HistorialClinicoScreen);