import React, { useEffect, useState } from 'react';
import {
    Platform,
    View,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    useWindowDimensions,
    TextInput,
    StyleSheet
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { DataTable, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const MuestrasTable = ({ route }) => {
    const navigation = useNavigation();
    const [muestra, SetMuestra] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filteredData, setFilteredData] = useState([]);
    const { width } = useWindowDimensions();
    const { token } = route.params;
    const isMobile = width < 768;
    const [page, setPage] = useState(0);
    const [numberOfItemsPerPage, setNumberOfItemsPerPage] = useState(5);
    const [searchQuery, setSearchQuery] = useState('');

    const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5090/api/Muestra' : 'http://localhost:5090/api/Muestra';

    const fetchMuestra = async () => {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            SetMuestra(data.$values || []);
            setFilteredData(data.$values || []);
        } catch (error) {
            console.error('Error al cargar muestra:', error);
            alert('Error al cargar muestra. Verifica tu conexión a Internet o la URL de la API.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMuestra();

        const unsubscribe = navigation.addListener('focus', () => {
            fetchMuestra();
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredData(muestra);
            setPage(0);
            return;
        }

        const filtered = muestra.filter(muestra => {
            const searchLower = searchQuery.toLowerCase();
            return (
                muestra.muestra1.toLowerCase().includes(searchLower)
            );
        });

        setFilteredData(filtered);
        setPage(0);
    }, [searchQuery, muestra]);

    const handleItemsPerPageChange = (value) => {
        setNumberOfItemsPerPage(value);
        setPage(0);
    }

    const handleEdit = (muestra) => {
        navigation.navigate('EditarMuestraScreend', {
            muestra: {
                id: muestra.id,
                muestra1: muestra.muestra1,
            },
            token: token
        });
    };

    const handleDelete = async (id) => {
        if (!token) {
            navigation.navigate('LoginScreen');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                fetchMuestra();
            } else {
                console.error('Error deleting muestra:', response.statusText);
            }
        } catch (error) {
            console.error('Error deleting muestra:', error);
        }
    };

    const from = page * numberOfItemsPerPage;
    const to = Math.min(from + numberOfItemsPerPage, filteredData.length);
    const paginatedMuestra = filteredData.slice(from, to);

    const navigationToCrearMuestra = () => {
        navigation.navigate('CrearMuestraScreen');
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
            {/* Barra de búsqueda */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar muestra..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {Platform.OS === 'web' && (
                    <TouchableOpacity onPress={navigationToCrearMuestra} style={styles.createButton}>
                        <Text style={styles.buttonText}>Crear muestra</Text>
                    </TouchableOpacity>
                )}
            </View>
    
            <Text style={styles.title}>LISTA DE MUESTRA</Text>
    
            <View style={styles.tableWrapper}>
                {Platform.OS === 'web' ? (
                    <div style={styles.webTableWrapper}>
                        <table style={styles.webTable}>
                            <thead>
                                <tr>
                                    <th style={styles.webHeaderCell}>ID</th>
                                    <th style={styles.webHeaderCell}>MUESTRA</th>
                                    <th style={styles.webHeaderCell}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedMuestra.map((muestra) => (
                                    <tr key={`web-row-${muestra.id}`}>
                                        <td style={styles.webBodyCell}>{muestra.id}</td>
                                        <td style={styles.webBodyCell}>{muestra.muestra1}</td>
                                        <td style={{ ...styles.webBodyCell, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                            <button onClick={() => handleEdit(muestra)} style={{
                                                backgroundColor: '#facc15',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                            }}>
                                                <Ionicons name="pencil" size={20} color="#1f2937" />
                                            </button>
                                            <button onClick={() => handleDelete(muestra.id)} style={{
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
                        <View style={{ minWidth: 350, flex: 1 }}>
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <View style={styles.headerCell}><Text style={styles.headerText}>ID</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>MUESTRA</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>Acciones</Text></View>
                            </View>
    
                            {/* Table Rows */}
                            <ScrollView style={styles.tableContent}>
                                {paginatedMuestra.map((muestra) => (
                                    <View key={`mobile-row-${muestra.id}`} style={styles.tableRow}>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{muestra.id}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{muestra.muestra1}</Text></View>
                                        <View style={styles.rowCell}>
                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleEdit(muestra)}>
                                                    <Ionicons name="pencil" size={20} color="#1f2937" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(muestra.id)}>
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
    
            {/* Paginación */}
            <View style={styles.paginationContainer}>
                <DataTable.Pagination
                    page={page}
                    numberOfPages={Math.ceil(filteredData.length / numberOfItemsPerPage)}
                    onPageChange={(newPage) => setPage(newPage)}
                    label={`${from + 1}-${to} de ${filteredData.length}`}
                    numberOfItemsPerPageList={[5, 10, 15, 20]}
                    numberOfItemsPerPage={numberOfItemsPerPage}
                    onItemsPerPageChange={(value) => {
                        setNumberOfItemsPerPage(value);
                        setPage(0);
                    }}
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
                    dropdownItemStyle={{
                        backgroundColor: 'white',
                        borderRadius: 8,
                        padding: 4,
                    }}
                    style={{ width: '100%' }}
                    labelStyle={{ minWidth: 120 }}
                    selectPageDropdownLabelStyle={{ minWidth: 120 }}
                />
            </View>
    
            {/* Botón solo en móvil */}
            {Platform.OS !== 'web' && (
                <View style={{ marginTop: 16 }}>
                    <TouchableOpacity onPress={navigationToCrearMuestra} style={styles.createButton}>
                        <Text style={styles.buttonText}>Crear muestra</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}    
export default MuestrasTable;