from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import base64
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)  # Habilitar CORS para todas las rutas

# Configurar Gemini AI
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-1.5-flash')

@app.route('/')
def home():
    return jsonify({
        "status": "OK",
        "message": "XML Processor API está funcionando",
        "endpoints": [
            "POST /api/process-page - Procesar imagen con IA"
        ]
    })

@app.route('/api/process-page', methods=['POST'])
def process_page():
    try:
        data = request.get_json()
        
        if not data or 'imageBase64' not in data:
            return jsonify({'error': 'No se proporcionó imagen'}), 400
        
        image_base64 = data['imageBase64']
        page_num = data.get('pageNum', 1)
        attempt = data.get('attempt', 0)
        
        # Decodificar imagen
        try:
            image_data = base64.b64decode(image_base64)
        except Exception as e:
            return jsonify({'error': f'Error al decodificar imagen: {str(e)}'}), 400
        
        # Prompt para el AI
        prompt = """
        Analiza esta imagen de documento y extrae toda la información estructurada.
        Devuelve un JSON con:
        - texto_extraido: todo el texto visible
        - elementos_estructurales: tablas, listas, títulos
        - metadatos: tipo de documento, idioma detectado
        - campos_formulario: si hay campos de formulario
        
        Responde solo en formato JSON válido.
        """
        
        # Procesar con Gemini
        try:
            # Crear objeto de imagen para Gemini
            image_part = {
                "mime_type": "image/png",
                "data": image_base64
            }
            
            response = model.generate_content([prompt, image_part])
            
            # Intentar parsear como JSON
            try:
                import json
                result = json.loads(response.text)
            except:
                # Si no es JSON válido, devolver como texto
                result = {
                    "texto_extraido": response.text,
                    "elementos_estructurales": [],
                    "metadatos": {
                        "tipo_documento": "desconocido",
                        "idioma": "desconocido"
                    },
                    "campos_formulario": []
                }
            
            return jsonify({
                "success": True,
                "page_number": page_num,
                "attempt": attempt,
                "result": result,
                "raw_response": response.text
            })
            
        except Exception as e:
            return jsonify({'error': f'Error de IA: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "gemini_configured": bool(os.getenv('GEMINI_API_KEY'))
    })

if __name__ == '__main__':
    print("🚀 Iniciando servidor XML Processor...")
    print("📍 URL: http://localhost:5000")
    print("🔑 Gemini API configurada:", bool(os.getenv('GEMINI_API_KEY')))
    app.run(debug=True, host='0.0.0.0', port=5000)