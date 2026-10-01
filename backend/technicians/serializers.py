from rest_framework import serializers
from .models import Technician, TechnicianAssistant, TechnicianService, TechnicianRecommendation


class TechnicianAssistantSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicianAssistant
        fields = ['id', 'technician', 'name', 'phone_number', 'email', 'role', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class TechnicianServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicianService
        fields = ['id', 'technician', 'service_name', 'description', 'typical_cost', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class TechnicianSerializer(serializers.ModelSerializer):
    assistants = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    
    class Meta:
        model = Technician
        fields = [
            'id', 'company_name', 'technician_name', 'email', 'phone_number',
            'alternate_phone', 'address', 'specialization', 'is_active',
            'assistants', 'services', 'created_at', 'updated_at'
        ]

    def get_assistants(self, obj):
        return TechnicianAssistantSerializer(obj.assistants.filter(is_active=True), many=True).data

    def get_services(self, obj):
        return TechnicianServiceSerializer(obj.services.filter(is_active=True), many=True).data


class TechnicianRecommendationSerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.technician_name', read_only=True)
    company_name = serializers.CharField(source='technician.company_name', read_only=True)
    
    class Meta:
        model = TechnicianRecommendation
        fields = [
            'id', 'technician', 'technician_name', 'company_name',
            'category_name', 'recommendation_type', 'description',
            'estimated_cost', 'priority', 'is_completed', 'completed_date',
            'notes', 'created_at'
        ]
        read_only_fields = ['created_at']
