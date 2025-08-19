import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons, FontAwesome, Ionicons, Entypo } from "@expo/vector-icons";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Dropdown } from "react-native-element-dropdown";
import RNPickerSelect from "react-native-picker-select";

const EditarClienteScreen = () => {
  const route = useRoute();
  console.log("Parámetros recibidos:", route.params);

  const { cliente = {}, userData = {} } = route.params || {};
  const navigation = useNavigation();

  // Función para calcular la edad a partir de la fecha de nacimiento
  const calculateAge = (birthDate) => {
    if (!birthDate) return "";
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  // Estado inicial con edad calculada
  const [form, setForm] = useState({
    idcliente: cliente.idcliente || cliente.idCliente || "",
    nombre: cliente.nombre || "",
    telefono: cliente.telefono || "",
    edad: calculateAge(cliente.fechaNacimiento), // Calculamos la edad inicial
    genero: cliente.genero || "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocusGenero, setIsFocusGenero] = useState(false);

  const API_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/Paciente"
      : "http://localhost:5090/api/Paciente";

  const generoOptions = [
    { label: "Masculino (M)", value: "M" },
    { label: "Femenino (F)", value: "F" },
  ];

  // Opciones para el selector de edad (1 a 100 años)
  const edadOptions = Array.from({ length: 100 }, (_, i) => ({
    label: `${i + 1} años`,
    value: (i + 1).toString(),
  }));

  const handleChange = (name, value) => {
    let processedValue = value;

    switch (name) {
      case "nombre":
        if (value.length === 0) {
          processedValue = "";
        } else if (value.length === 1) {
          processedValue = value.toUpperCase();
        } else {
          processedValue = value.charAt(0).toUpperCase() + value.slice(1);
        }
        processedValue = processedValue.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, "");
        break;

      case "telefono":
        processedValue = value.replace(/[^0-9]/g, "").slice(0, 10);
        break;

      default:
        processedValue = value;
    }

    setForm((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleUpdate = async () => {
    if (!/^[A-ZÁÉÍÓÚÑ]/.test(form.nombre)) {
      Toast.show({
        type: "warning",
        text1: "🚫 Nombre inválido",
        text2: "La primera letra debe ser mayúscula",
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

    if (form.telefono && form.telefono.replace(/[^0-9]/g, "").length < 7) {
      Toast.show({
        type: "warning",
        text1: "🚫 Teléfono inválido",
        text2: "Mínimo 7 dígitos",
        visibilityTime: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const clienteId = form.idcliente || cliente.idcliente || cliente.idCliente;

      if (!clienteId) {
        throw new Error("No se pudo obtener el ID del cliente");
      }

      // Convertir edad a fecha de nacimiento aproximada
      const edad = parseInt(form.edad) || 0;
      const hoy = new Date();
      const añoNacimiento = hoy.getFullYear() - edad;
      const fechaNacimientoAprox = `${añoNacimiento}-01-01`; // Usamos 1ero de enero como fecha aproximada

      const dataToSend = {
        idcliente: clienteId,
        nombre: form.nombre.trim(),
        telefono: form.telefono || null,
        FechaNacimiento: fechaNacimientoAprox,
        genero: form.genero || null,
      };

      console.log("Datos a enviar:", JSON.stringify(dataToSend, null, 2));

      const response = await fetch(`${API_URL}/${clienteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData?.token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar cliente");
      }

      Toast.show({
        type: "success",
        text1: "✅ Cliente actualizado",
        text2: "Los cambios se guardaron correctamente",
        visibilityTime: 3000,
        onHide: () => navigation.goBack(),
      });
    } catch (error) {
      console.error("Error completo:", error);

      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: error.message || "Ocurrió un error al actualizar",
        visibilityTime: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Campo Nombre */}
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="person"
            size={20}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="NOMBRE COMPLETO"
            value={form.nombre}
            onChangeText={(text) => handleChange("nombre", text)}
            placeholderTextColor="#999"
          />
        </View>
        {errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}

        {/* Campo Teléfono */}
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="phone"
            size={20}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            value={form.telefono}
            onChangeText={(text) => handleChange("telefono", text)}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
        </View>

        {/* Campo Edad (reemplaza fecha de nacimiento) */}
        <View style={styles.inputContainer}>
          <Entypo
            name="calendar"
            size={22}
            color="#555"
            style={styles.icon}
          />
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              onValueChange={(value) => handleChange("edad", value)}
              items={edadOptions}
              placeholder={{
                label: "SELECCIONE LA EDAD",
                value: "",
                color: '#888'
              }}
              value={form.edad}
              style={pickerSelectStyles}
              useNativeAndroidPickerStyle={false}
              Icon={() => {
                return (
                  <View style={styles.iconDropdown}>
                    <Entypo name="chevron-down" size={20} color="#555" />
                  </View>
                );
              }}
            />
          </View>
        </View>

        {/* Campo Género */}
        <View style={styles.inputContainer}>
          <FontAwesome
            name="transgender"
            size={22}
            color="#555"
            style={styles.icon}
          />
          <Dropdown
            style={[
              styles.dropdown,
              isFocusGenero && { borderColor: "#3a0ca3" },
            ]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            data={generoOptions}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="SELECCIONE UN GÉNERO"
            value={form.genero}
            onFocus={() => setIsFocusGenero(true)}
            onBlur={() => setIsFocusGenero(false)}
            onChange={(item) => {
              setForm((prev) => ({ ...prev, genero: item.value }));
              setIsFocusGenero(false);
            }}
          />
        </View>

        {/* Botones */}
        <View style={styles.buttonGroup}>
          <Button
            mode="outlined"
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonText}
            onPress={() => navigation.goBack()}
            icon="close"
          >
            Cancelar
          </Button>

          <Button
            mode="contained"
            style={styles.submitButton}
            onPress={handleUpdate}
            loading={isSubmitting}
            disabled={isSubmitting}
            icon="content-save"
          >
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
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
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
  },
  iconDropdown: {
    marginTop: 10,
    marginRight: 10,
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
  dropdown: {
    flex: 1,
    height: 50,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
  },
  placeholderStyle: {
    fontSize: 16,
    color: "#888",
  },
  selectedTextStyle: {
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    marginLeft: 10,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  inputAndroid: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  placeholder: {
    color: "#888",
  },
  iconContainer: {
    top: 10,
    right: 12,
  },
});

export default EditarClienteScreen;