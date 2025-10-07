import React, { useEffect, useState } from 'react';
import {
    Platform,
    View,
    ActivityIndicator,
    TouchableOpacity,
    useWindowDimensions,
    TextInput,
    Button,
    StyleSheet,
    Dimensions
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { DataTable, Text, Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from "@react-native-async-storage/async-storage";

const TipoExamenTable = ({ route }) => {
    const { token, userData } = route.params;
    const navigation = useNavigation();
    const [TipoExamen, setTipoExamen] = useState([]);
    const [filteredTipoExamen, setFilteredTipoExamen] = useState([]);
    const [loading, setLoading] = useState(true);
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [page, setPage] = useState(0);
    const [numberOfItemsPerPage, setNumberOfItemsPerPage] = useState(5);
    const [searchQuery, setSearchQuery] = useState('');

    const API_URL = Platform.OS === 'android'
        ? "http://10.0.2.2:5090/api/TipoExamen"
        : "http://localhost:5090/api/TipoExamen";

        const fetchTipoExamen = async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) throw new Error("No se encontró token, inicia sesión");
          
              const response = await fetch(API_URL, {
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`, // <--- aquí
                },
              });
          
              if (!response.ok) throw new Error(`Error ${response.status} al cargar Tipo Examen`);
          
              const data = await response.json();
              setTipoExamen(data.$values || []);
              setFilteredTipoExamen(data.$values || []);
            } catch (error) {
              console.error("Error al cargar Tipo Examen:", error);
              Toast.show({
                type: "error",
                text1: "❌ Error al cargar",
                text2: "No se pudo obtener la lista de tipos de examen",
                visibilityTime: 3000,
              });
            } finally {
              setLoading(false);
            }
          };
          
          useEffect(() => {
            fetchTipoExamen();
            const unsubscribe = navigation.addListener("focus", () => {
              fetchTipoExamen();
            });
            return unsubscribe;
          }, [navigation]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredTipoExamen(TipoExamen);
            setPage(0);
            return;
        }

        const filtered = TipoExamen.filter(TipoExamen => {
            const searchLower = searchQuery.toLowerCase();
            return (
                TipoExamen.nombreExamen.toLowerCase().includes(searchLower) ||
                TipoExamen.descripcion.toLowerCase().includes(searchLower) ||
                TipoExamen.subtitulos.toLowerCase().includes(searchLower) ||
                TipoExamen.precio.toLowerCase().includes(searchLower)
            );
        });
        setFilteredTipoExamen(filtered);
        setPage(0);
    }, [searchQuery, TipoExamen]);

    const handleItemsPerPageChange = (value) => {
        setNumberOfItemsPerPage(value);
        setPage(0);
    };

    const handleEdit = (TipoExamen) => {
        navigation.navigate('EditarTipoExamenScreen', {
          TipoExamen: {
            idtipoExamen: TipoExamen.idtipoExamen,
            nombreExamen: TipoExamen.nombreExamen,
            descripcion: TipoExamen.descripcion,
            subtitulos: TipoExamen.subtitulos,
            precio: TipoExamen.precio
          },
          token: token
        });
    };

    const handleDelete = async (idtipoExamen) => {
        try {
            const response = await fetch(`${API_URL}/${idtipoExamen}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                Toast.show({
                    type: 'error',
                    text1: '❌ Tipo eliminado',
                    text2: 'El tipo de examen se eliminó correctamente',
                    visibilityTime: 3000
                });
                fetchTipoExamen();
            } else {
                throw new Error('Error al eliminar Tipo Examen');
            }
        } catch (error) {
            console.error('Error:', error);
            Toast.show({
                type: 'error',
                text1: '❌ Error al eliminar',
                text2: 'No se pudo eliminar el tipo de examen',
                visibilityTime: 3000
            });
        }
    };

    const from = page * numberOfItemsPerPage;
    const to = Math.min(from + numberOfItemsPerPage, filteredTipoExamen.length);
    const paginatedTipoExamen = filteredTipoExamen.slice(from, to);

    const navigateToCreate = () => {
        navigation.navigate('CrearTipoExamenScreend');
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
            width: isMobile ? 120 : 150,
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
            width: isMobile ? 120 : 150,
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
                    placeholder="Buscar tipoexamen..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
    
                {/* Botón solo en Web */}
                {Platform.OS === 'web' && (
                    <TouchableOpacity onPress={navigateToCreate} style={styles.createButton}>
                        <Text style={styles.buttonText}>Crear TipoExamen</Text>
                    </TouchableOpacity>
                )}
            </View>
    
            <Text style={styles.title}>LISTA DE TIPOEXAMEN</Text>
    
            <View style={styles.tableWrapper}>
                {Platform.OS === 'web' ? (
                    <div style={styles.webTableWrapper}>
                        <table style={styles.webTable}>
                            <thead>
                                <tr>
                                    <th style={styles.webHeaderCell}>ID</th>
                                    <th style={styles.webHeaderCell}>EXAMEN</th>
                                    <th style={styles.webHeaderCell}>DESCRIPCION</th>
                                    <th style={styles.webHeaderCell}>SUBTITULOS</th>
                                    <th style={styles.webHeaderCell}>PRECIO</th>
                                    <th style={styles.webHeaderCell}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTipoExamen.map((tipoexamen) => (
                                    <tr key={`web-row-${tipoexamen.idtipoExamen}`}>
                                        <td style={styles.webBodyCell}>{tipoexamen.idtipoExamen}</td>
                                        <td style={styles.webBodyCell}>{tipoexamen.nombreExamen}</td>
                                        <td style={styles.webBodyCell}>{tipoexamen.descripcion}</td>
                                        <td style={styles.webBodyCell}>{tipoexamen.subtitulos}</td>
                                        <td style={styles.webBodyCell}>${tipoexamen.precio.toFixed(2)}</td>
                                        <td style={{ ...styles.webBodyCell, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                            <button onClick={() => handleEdit(tipoexamen)} style={{
                                                backgroundColor: '#facc15',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                            }}>
                                                <Ionicons name="pencil" size={20} color="#1f2937" />
                                            </button>
                                            <button onClick={() => handleDelete(tipoexamen.idtipoExamen)} style={{
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
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <View style={styles.headerCell}><Text style={styles.headerText}>ID</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>EXAMEN</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>DESCRIPCION</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>SUBTITULOS</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>PRECIO</Text></View>
                                <View style={styles.headerCell}><Text style={styles.headerText}>Acciones</Text></View>
                            </View>
    
                            {/* Table Rows - Scroll vertical */}
                            <ScrollView style={styles.tableContent}>
                                {paginatedTipoExamen.map((tipoexamen) => (
                                    <View key={`mobile-row-${tipoexamen.idtipoExamen}`} style={styles.tableRow}>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{tipoexamen.idtipoExamen}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{tipoexamen.nombreExamen}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{tipoexamen.descripcion}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>{tipoexamen.subtitulos}</Text></View>
                                        <View style={styles.rowCell}><Text style={styles.rowText}>${tipoexamen.precio.toFixed(2)}</Text></View>
                                        <View style={styles.rowCell}>
                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleEdit(tipoexamen)}>
                                                    <Ionicons name="pencil" size={20} color="#1f2937" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(tipoexamen.idtipoExamen)}>
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
                    numberOfPages={Math.ceil(filteredTipoExamen.length / numberOfItemsPerPage)}
                    onPageChange={(newPage) => {
                        setPage(newPage);
                        setNumberOfItemsPerPage(numberOfItemsPerPage);
                    }}
                    label={`${from + 1}-${to} de ${filteredTipoExamen.length}`}
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
    
            {/* Botón solo en móvil, debajo de la paginación */}
            {Platform.OS !== 'web' && (
                <View style={{ marginTop: 16 }}>
                    <TouchableOpacity onPress={navigateToCreate} style={styles.createButton}>
                        <Text style={styles.buttonText}>Crear TipoExamen</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}    

export default TipoExamenTable;