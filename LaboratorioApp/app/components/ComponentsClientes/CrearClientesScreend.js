import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DatePickerModal } from "react-native-paper-dates";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MaterialIcons,
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
  Entypo,
} from "@expo/vector-icons";
import { Button } from "react-native-paper";
import Toast from "react-native-toast-message";
import { Dropdown } from 'react-native-element-dropdown';

const CrearClientesScreend = ({ route }) => {
  const { token } = route.params; // Asegúrate de recibir el token
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    fechaNacimiento: "",
    genero: "",
  });

  const [showPicker, setShowPicker] = useState(false);
  const [isFocusGenero, setIsFocusGenero] = useState(false);
  const navigation = useNavigation();

  const generoOptions = [
    { label: 'Masculino (M)', value: 'M' },
    { label: 'Femenino (F)', value: 'F' },
  ];

  const handleChange = (name, value) => {
    let processedValue = value;

    switch (name) {
      case "nombre":
        // Mayúsculas + solo letras y espacios
        processedValue = value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, "");
        break;
    
      case "telefono":
        // Solo números (hasta 10 dígitos)
        processedValue = value.replace(/[^0-9]/g, "").slice(0, 10);
        break;
      case "genero":
        // Solo M o F en mayúsculas
        processedValue = value.toUpperCase().replace(/[^MF]/g, "").slice(0, 1);
        break;
      case "direccion":
        // Permite letras, números, #, -, /, pero no fuerza mayúsculas
        processedValue = value.replace(/[^\w\s#-/]/g, "");
        break;
      default:
        // Email y fecha no se modifican
        processedValue = value;
    }

    setForm((prev) => ({ ...prev, [name]: processedValue }));
  };

  const API_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/Paciente"
      : "http://localhost:5090/api/Paciente";

  const handleSubmit = async () => {
    // Validación básica
    if (!/^[A-ZÁÉÍÓÚÑ\s]+$/.test(form.nombre)) {
      Toast.show({
        type: "warning",
        text1: "🚫 Nombre inválido",
        text2: "Solo se permiten letras mayúsculas y espacios",
        visibilityTime: 3000,
      });
      return;
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.nombre)) {
      Toast.show({
        type: "warning",
        text1: "🚫 Nombre inválido",
        text2: "Solo se permiten letras y espacios",
        visibilityTime: 3000,
      });
      return;
    }

    if (form.nombre.trim().length < 3) {
      Toast.show({
        type: "warning",
        text1: "🚫 Nombre muy corto",
        text2: "El nombre debe tener al menos 3 caracteres",
        visibilityTime: 3000,
      });
      return;
    }





    // Validación de teléfono (si se proporciona)
    if (form.telefono && !/^[\d\s+-]+$/.test(form.telefono)) {
      Toast.show({
        type: "warning",
        text1: "🚫 Teléfono inválido",
        text2: "Solo números, + o -",
        visibilityTime: 3000,
      });
      return;
    }

    if (form.telefono && form.telefono.replace(/[^0-9]/g, "").length < 7) {
      Toast.show({
        type: "warning",
        text1: "🚫 Teléfono inválido",
        text2: "Mínimo 7 dígitos",
        visibilityTime: 3000,
      });
      return;
    }

    // Validación de género (si se proporciona)
    if (form.genero && !/^[MF]$/i.test(form.genero)) {
      Toast.show({
        type: "warning",
        text1: "🚫 Género inválido",
        text2: "Ingrese M (masculino) o F (femenino)",
        visibilityTime: 3000,
      });
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        Toast.show({
          type: "success",
          text1: "✅ Cliente creado",
          text2: "El cliente se registró correctamente",
          visibilityTime: 3000,
          onHide: () => navigation.goBack(),
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear cliente");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: error.message || "Ocurrió un error al crear el cliente",
        visibilityTime: 3000,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo Cliente</Text>
        </View>

        {/* Campo Nombre */}
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="person"
            size={24}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="NOMBRE COMPLETO (EN MAYÚSCULAS)"
            value={form.nombre}
            onChangeText={(text) => handleChange("nombre", text)}
            autoCapitalize="characters"
          />
        </View>

        {/* Campo Teléfono */}
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="phone"
            size={22}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="TELEFONO"
            value={form.telefono}
            onChangeText={(text) => handleChange("telefono", text)}
            keyboardType="phone-pad"
          />
        </View>


        {/* Campo Fecha de Nacimiento */}
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => setShowPicker(true)}
        >
          <MaterialCommunityIcons
            name="calendar"
            size={22}
            color="#555"
            style={styles.icon}
          />
          <View style={styles.dateInput}>
            <Text style={{ color: form.fechaNacimiento ? "#000" : "#888" }}>
              {form.fechaNacimiento || "FECHA DE NACIMIENTO"}
            </Text>
          </View>
        </TouchableOpacity>

    {/* Campo Género (Dropdown) */}
    <View style={styles.inputContainer}>
          <FontAwesome name="transgender" size={22} color="#555" style={styles.icon} />
          <Dropdown
            style={[styles.dropdown, isFocusGenero && { borderColor: '#3a0ca3' }]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            data={generoOptions}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="SELECCIONE UN GENERO"
            value={form.genero}
            onFocus={() => setIsFocusGenero(true)}
            onBlur={() => setIsFocusGenero(false)}
            onChange={item => {
              setForm(prev => ({ ...prev, genero: item.value }));
              setIsFocusGenero(false);
            }}

          />
        </View>
        {showPicker && (
          <DatePickerModal
            locale="es"
            mode="single"
            visible={showPicker}
            onDismiss={() => setShowPicker(false)}
            date={
              form.fechaNacimiento ? new Date(form.fechaNacimiento) : new Date()
            }
            onConfirm={({ date }) => {
              setShowPicker(false);
              const isoString = date.toISOString().split("T")[0];
              setForm((prev) => ({ ...prev, fechaNacimiento: isoString }));
            }}
          />
        )}

        <View style={styles.buttonGroup}>
          <Button
            mode="outlined"
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonText}
            onPress={() => navigation.goBack()}
          >
            Cancelar
          </Button>

          <Button
            mode="contained"
            style={styles.submitButton}
            onPress={handleSubmit}
            icon="check"
          >
            Guardar Cliente
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  icon: {
    marginRight: 10,
    width: 24,
    textAlign: "center",
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  dateInput: {
    flex: 1,
    height: 50,
    justifyContent: "center",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    borderColor: "#d32f2f",
    borderWidth: 1,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "red",
  },
  submitButton: {
    flex: 2,
    backgroundColor: "#388e3c",
    borderRadius: 8,
    elevation: 2,
  },
   // Estilos para el Dropdown
   dropdown: {
    flex: 1,
    height: 50,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent'
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#888'
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#333'
  },
});

export default CrearClientesScreend;
