import hashlib
import base64
from dMRV.core.base_agent import BaseAgent

class EncryptionAgent(BaseAgent):
    def __init__(self):
        super().__init__("EncryptionAgent")
        # In production, this should be a secure key from a Key Management Service (KMS)
        self.secret_key = "DMRV_SECURE_SECRET_KEY" 

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Applying encryption and calculating integrity hashes...")
        classified_data = state.data.get('classified_data', [])
        encrypted_data = []

        for item in classified_data:
            # 1. Data Integrity: Calculate SHA-256 Hash of raw content
            raw_content = str(item).encode()
            integrity_hash = hashlib.sha256(raw_content).hexdigest()
            item['integrity_hash'] = integrity_hash
            
            # 2. Automated Encryption for CONFIDENTIAL/RESTRICTED data
            if item.get('classification') in ['CONFIDENTIAL', 'RESTRICTED']:
                item = self._encrypt_item(item)
            
            encrypted_data.append(item)
        
        state.update('encrypted_data', encrypted_data)
        state.log(self.name, f"Encryption and Integrity check complete for {len(encrypted_data)} items.")
        return True

    def _encrypt_item(self, item):
        """
        Automated encryption logic. 
        NOTE: This is a placeholder using Base64+Salt for Termux environment.
        In production, replace with AES-256 (cryptography.fernet).
        """
        for key in list(item.keys()):
            if key not in ['classification', 'detected_pii', 'integrity_hash']:
                val = str(item[key])
                # Mock Encryption: Base64(Salt + Val)
                salted_val = f"{self.secret_key}:{val}".encode()
                item[key] = base64.b64encode(salted_val).decode()
        
        item['is_encrypted'] = True
        return item
