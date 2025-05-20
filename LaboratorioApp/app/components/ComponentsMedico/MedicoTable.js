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
            const response = await fetch(API_URL);
            const data = await response.json();
            setMedico(data.$values || []);
            setFilteredMedico(data.$values || []);
        } catch (error) {
            console.error('Error al cargar el Medico:', error);
            alert('Error al cargar el Medico. Verifica tu conexión a Internet o la URL de la API.');
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
                alert('Médico eliminado correctamente');
                fetchMedico();
            } else {
                throw new Error('Error al eliminar médico');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar médico');
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
            padding: 16,
            backgroundColor: '#f1f5f9',
            position: 'relative',
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
        buttonContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 16,
        },
        createButton: {
            backgroundColor: '#4CAF50',
            borderRadius: 8,
            padding: 15,
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
        },
        buttonText: {
            color: 'white',
            fontWeight: 'bold',
            fontSize: 16,
        },
        title: {
            fontSize: 22,
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: 12,
            textAlign: 'center',
        },
        tableWrapper: {
            flex: 1,
            marginBottom: isMobile ? 120 : 80, // Más espacio para el botón en móvil
        },
        tableContainer: {
            backgroundColor: 'white',
            borderRadius: 12,
            overflow: 'hidden',
        },
        tableHeader: {
            flexDirection: 'row',
            backgroundColor: '#334155',
            paddingVertical: 14,
            minWidth: isMobile ? 800 : '100%',
        },
        headerCell: {
            width: 150,
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerText: {
            color: 'white',
            fontWeight: 'bold',
            fontSize: 15,
        },
        tableContent: {
            maxHeight: isMobile ? Dimensions.get('window').height * 0.4 : 'auto',
        },
        tableRow: {
            flexDirection: 'row',
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
            minWidth: isMobile ? 800 : '100%',
        },
        rowCell: {
            width: 150,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 8,
        },
        rowText: {
            color: '#0f172a',
            fontSize: 15,
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
            position: 'absolute',
            bottom: isMobile ? 70 : 16, // Ajuste para el botón en móvil
            left: 16,
            right: 16,
            zIndex: 1,
        },
        fixedButtonContainer: {
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 2,
        },
        webTableWrapper: {
            overflowX: 'auto',
            backgroundColor: '#f1f5f9',
            maxHeight: 'calc(100vh - 200px)',
            marginBottom: 80,
        },
        webTable: {
            width: '100%',
            minWidth: 800,
            borderCollapse: 'collapse',
        },
        webHeaderCell: {
            backgroundColor: '#334155',
            color: 'white',
            padding: 14,
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: 15,
            width: 150,
            position: 'sticky',
            top: 0,
        },
        webBodyCell: {
            padding: 14,
            borderBottomWidth: 1,          // Grosor del borde
            borderBottomColor: '#e2e8f0',  // Color del borde
            textAlign: 'center',
            fontSize: 15,
            color: '#0f172a',
            backgroundColor: 'white',
            width: 150,
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