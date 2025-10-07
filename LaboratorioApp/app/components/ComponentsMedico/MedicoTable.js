import React, { useEffect, useState } from 'react';
import {
    Platform,
    View,
    ActivityIndicator,
    TouchableOpacity,
    useWindowDimensions,
    TextInput,
    StyleSheet,
    Dimensions
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { DataTable, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from 'react-native-toast-message';


const MedicoTable = ({ route }) => {
    const navigation = useNavigation();
    const [Medico, setMedico] = useState([]);
    const [filteredMedico, setFilteredMedico] = useState([]);
    const [loading, setLoading] = useState(true);
    const { width } = useWindowDimensions();
    const { token } = route.params;  // This is where token comes from
    const isMobile = width < 768;
    const [page, setPage] = useState(0);
    const [numberOfItemsPerPage, setNumberOfItemsPerPage] = useState(5);
    const [searchQuery, setSearchQuery] = useState('');

    const API_URL = Platform.OS === 'android'
        ? "http://10.0.2.2:5090/api/MedicoUser"
        : "http://localhost:5090/api/MedicoUser";

        const fetchMedico = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                console.log("🔑 Token usado en Médicos:", token);
        
                const response = await fetch(API_URL, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
        
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
        
                const data = await response.json();
                setMedico(data.$values || []);
                setFilteredMedico(data.$values || []);
            } catch (error) {
                console.error("Error al cargar el Médico:", error);
                alert("Error al cargar el Médico. Verifica tu conexión a Internet o la URL de la API.");
            } finally {
                setLoading(false);
            }
        };
    useEffect(() => {
        fetchMedico();
        const unsubscribe = navigation.addListener('focus', () => {
            fetchMedico();
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredMedico(Medico);
            setPage(0);
            return;
        }

        const filtered = Medico.filter(medico => {
            const searchLower = searchQuery.toLowerCase();
            return (
                medico.nombre.toLowerCase().includes(searchLower) ||
                medico.especialidad.toLowerCase().includes(searchLower)
            );
        });
        setFilteredMedico(filtered);
        setPage(0);
    }, [searchQuery, Medico]);

    const handleEdit = (medico) => {
        navigation.navigate('EditarMedicoScreen', { 
            Medico: medico,  // Use the medico parameter passed to the function
            token: token     // Use the token from your component's props
        });
    };

    const handleDelete = async (idmedico) => {
        try {
            const response = await fetch(`${API_URL}/${idmedico}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                Toast.show({
                    type: 'success',
                    text1: 'Médico eliminado',
                    text2: 'El médico se eliminó correctamente',
                    visibilityTime: 2000,
                    onHide: () => fetchMedico() // Recargar después de mostrar el mensaje
                });
            } else {
                throw new Error('Error al eliminar médico');
            }
        } catch (error) {
            console.error('Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error al eliminar',
                text2: 'No se pudo eliminar el médico',
                visibilityTime: 3000
            });
        }
    };
    const from = page * numberOfItemsPerPage;
    const to = Math.min(from + numberOfItemsPerPage, filteredMedico.length);
    const paginatedMedico = filteredMedico.slice(from, to);

    const navigateToCreate = () => {
        navigation.navigate('CrearMedicoScreen');
    };

    if (loading) {
        return <ActivityIndicator style={{ marginTop: 50 }} size="large" />;
    }

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            padding: isMobile ? 10 : 20,
            backgroundColor: '#f1f5f9',
        },
        searchContainer: {
            flexDirection: 'column',
            marginBottom: 16,
        },
        searchInput: {
            borderColor: '#cbd5e1',
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: 'white',
            fontSize: 16,
            minHeight: 50,
            marginBottom: 10,
        },
        createButton: {
            backgroundColor: '#4CAF50',
            borderRadius: 8,
            padding: 15,
            justifyContent: 'center',
            alignItems: 'center',
            width: isMobile ? '100%' : 200,
            alignSelf: isMobile ? 'stretch' : 'flex-end',
            marginBottom: 16,
        },
        buttonText: {
            color: 'white',
            fontWeight: 'bold',
            fontSize: 16,
        },
        title: {
            fontSize: isMobile ? 20 : 24,
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: 16,
            textAlign: 'center',
        },
        tableWrapper: {
            flex: 1,
            marginBottom: isMobile ? 120 : 80,
        },
        tableContainer: {
            backgroundColor: 'white',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        tableHeader: {
            flexDirection: 'row',
            backgroundColor: '#334155',
            paddingVertical: 14,
        },
        headerCell: {
            width: isMobile ? 120 : 150, // Cambiado de minWidth a width fijo
            paddingHorizontal: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerText: {
            color: 'white',
            fontWeight: 'bold',
            fontSize: isMobile ? 12 : 14,
            textAlign: 'center',
        },
        tableContent: {
            maxHeight: isMobile ? Dimensions.get('window').height * 0.5 : 'auto',
        },
        tableRow: {
            flexDirection: 'row',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
        },
        rowCell: {
            width: isMobile ? 120 : 150, // Cambiado de minWidth a width fijo
            paddingHorizontal: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        rowText: {
            color: '#0f172a',
            fontSize: isMobile ? 12 : 14,
            textAlign: 'center',
        },
        actionButtons: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
        },
        actionButton: {
            padding: 8,
            borderRadius: 6,
            justifyContent: 'center',
            alignItems: 'center',
        },
        editButton: {
            backgroundColor: '#facc15',
        },
        deleteButton: {
            backgroundColor: '#ef4444',
        },
        paginationContainer: {
            backgroundColor: '#f1f5f9',
            padding: 12,
            borderRadius: 12,
            marginTop: 16,
        },
        webTableWrapper: {
            width: '100%',
            overflowX: 'auto',
            marginBottom: 16,
        },
        webTable: {
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: 12,
            overflow: 'hidden',
        },
        webHeaderCell: {
            backgroundColor: '#334155',
            color: 'white',
            padding: 12,
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: 14,
            position: 'sticky',
            top: 0,
        },
        webBodyCell: {
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
            textAlign: 'center',
            fontSize: 14,
            color: '#0f172a',
            backgroundColor: 'white',
        },
        webActionCell: {
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
            textAlign: 'center',
            backgroundColor: 'white',
        },
        webActionButton: {
            backgroundColor: '#facc15',
            borderWidth: 0,
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginHorizontal: 5,
            cursor: 'pointer',
        },
        webDeleteButton: {
            backgroundColor: '#ef4444',
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar medico..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
    
                {Platform.OS === 'web' && (
                    <TouchableOpacity onPress={navigateToCreate} style={styles.createButton}>
                        <Text style={styles.buttonText}>Crear medico</Text>
                    </TouchableOpacity>
                )}
            </View>
    
            <Text style={styles.title}>LISTA DE MÉDICOS</Text>
    
            <View style={styles.tableWrapper}>
                {Platform.OS === 'web' ? (
                    <div style={styles.webTableWrapper}>
                        <table style={styles.webTable}>
                            <thead>
                                <tr>
                                    <th style={styles.webHeaderCell}>ID</th>
                                    <th style={styles.webHeaderCell}>NOMBRE</th>
                                    <th style={styles.webHeaderCell}>ESPECIALIDAD</th>
                                    <th style={styles.webHeaderCell}>TELÉFONO</th>
                                    <th style={styles.webHeaderCell}>CORREO</th>
                                    <th style={styles.webHeaderCell}>ROL</th>
                                    <th style={styles.webHeaderCell}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedMedico.map((medico) => (
                                    <tr key={`web-row-${medico.idmedico}`}>
                                        <td style={styles.webBodyCell}>{medico.idmedico}</td>
                                        <td style={styles.webBodyCell}>{medico.nombre}</td>
                                        <td style={styles.webBodyCell}>{medico.especialidad}</td>
                                        <td style={styles.webBodyCell}>{medico.telefono}</td>
                                        <td style={styles.webBodyCell}>{medico.correo}</td>
                                        <td style={styles.webBodyCell}>{medico.rol}</td>
                                        <td style={{ ...styles.webBodyCell, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                            <button onClick={() => handleEdit(medico)} style={{
                                                backgroundColor: '#facc15',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                            }}>
                                                <Ionicons name="pencil" size={20} color="#1f2937" />
                                            </button>
                                            <button onClick={() => handleDelete(medico.idmedico)} style={{
                                                backgroundColor: '#ef4444',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                            }}>
                                                <Ionicons name="trash" size={20} color="white" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <ScrollView horizontal>
                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <View style={styles.headerCell}><Text style={styles.headerText}>ID</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>Nombre</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>ESPECIALIDAD</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>CEDULA</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>DIRECCIÓN</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>TELÉFONO</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>CORREO</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>ROL</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>Acciones</Text></View>
                            </View>
    
                            <ScrollView style={styles.tableContent}>
                                {paginatedMedico.map((medico) => (
                                    <View key={`mobile-row-${medico.idmedico}`} style={styles.tableRow}>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{medico.idmedico}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{medico.nombre}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{medico.especialidad}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{medico.cedula}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{medico.direccion}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{medico.telefono}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{medico.correo}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{medico.rol}</Text></View>
                                        <View style={styles.rowCell}>
                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleEdit(medico)}>
                                                    <Ionicons name="pencil" size={20} color="#1f2937" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(medico.idmedico)}>
                                                    <Ionicons name="trash" size={20} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </ScrollView>
                )}
            </View>
    
            <View style={styles.paginationContainer}>
                <DataTable.Pagination
                    page={page}
                    numberOfPages={Math.ceil(filteredMedico.length / numberOfItemsPerPage)}
                    onPageChange={(newPage) => setPage(newPage)}
                    label={`${from + 1}-${to} de ${filteredMedico.length}`}
                    numberOfItemsPerPageList={[5, 10, 15, 20]}
                    numberOfItemsPerPage={numberOfItemsPerPage}
                    onItemsPerPageChange={setNumberOfItemsPerPage}
                    selectPageDropdownLabel={'Filas por página:'}
                    showFastPaginationControls
                    theme={{
                        colors: {
                            text: '#000000',
                            primary: '#000000',
                            placeholder: '#000000',
                            accent: '#000000',
                        }
                    }}
                />
            </View>
    
            {Platform.OS !== 'web' && (
                <View style={{ marginTop: 16 }}>
                    <TouchableOpacity onPress={navigateToCreate} style={styles.createButton}>
                        <Text style={styles.buttonText}>Crear Médico</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}    

export default MedicoTable;