@api_view(['POST'])
@permission_classes([AllowAny])
def chatbot_query(request):
    """
    Endpoint para el chatbot RAG
    """
    try:
        # Validar entrada
        message = request.data.get('message', '').strip()
        user_lat = request.data.get('lat')
        user_lon = request.data.get('lon')

        if not message:
            return Response(
                {
                    'success': False,
                    'error': 'El mensaje no puede estar vacío'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar disponibilidad del RAG
        if not RAG_AVAILABLE:
            return Response(
                {
                    'success': False,
                    'error': 'El chatbot no está disponible en este momento'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Comandos especiales
        if message.lower() in ['reset', 'reiniciar', 'borrar historial', 'limpiar']:
            rag = get_rag_instance()
            rag.reset_conversation()
            return Response({
                'success': True,
                'answer': '🔄 Conversación reiniciada. ¿En qué puedo ayudarte ahora?',
                'metadata': {'command': 'reset'}
            })

        # Procesar consulta normal
        logger.info(f"💬 Consulta chatbot: {message[:50]}...")
        rag = get_rag_instance()
        result = rag.query(message, user_lat=user_lat, user_lon=user_lon)

        # FIX CRÍTICO: Asegurar que los \n se preserven en el JSON
        answer_text = result['answer']

        # Debug: verificar que los saltos están presentes
        logger.debug(f"📝 Respuesta tiene {answer_text.count(chr(10))} saltos de línea")

        return Response({
            'success': True,
            'answer': answer_text,  # Django Rest Framework maneja esto correctamente
            'metadata': {
                'budget_detected': result.get('budget_detected'),
                'location_used': result.get('location_used'),
                'context_docs': len(result.get('context', [])),
                'conversation_length': len(rag.chat_history)
            }
        }, status=status.HTTP_200_OK)

    except RuntimeError as e:
        logger.error(f"❌ Error de configuración RAG: {e}")
        return Response({
            'success': False,
            'error': 'El servicio de chatbot no está configurado correctamente'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    except Exception as e:
        logger.error(f"❌ Error inesperado en chatbot: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Ups, algo salió mal. ¿Puedes intentar de nuevo? 🦉'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)