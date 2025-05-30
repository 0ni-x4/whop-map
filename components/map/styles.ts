export const mapStyles = `
  .mapboxgl-map {
    position: absolute !important;
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgb(12, 12, 35) !important;
  }
  .mapboxgl-canvas {
    position: absolute !important;
    width: 100% !important;
    height: 100% !important;
    outline: none !important;
    filter: brightness(0.9) contrast(1.05) saturate(0.95) !important;
  }
  .mapboxgl-control-container {
    display: none !important;
  }
  .place-popup {
    background: rgba(255, 255, 255, 0.98) !important;
    backdrop-filter: blur(10px) !important;
    border-radius: 12px !important;
    padding: 0 !important;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    z-index: 999 !important;
    pointer-events: auto !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
  .place-popup .mapboxgl-popup-content {
    background: transparent !important;
    padding: 0 !important;
    border-radius: 12px !important;
    pointer-events: auto !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
  .place-popup .mapboxgl-popup-tip {
    display: none !important;
  }
  .place-info {
    padding: 16px;
    min-width: 200px;
    pointer-events: auto;
    position: relative;
    z-index: 1000;
  }
  .place-info h3 {
    margin: 0 0 8px 0;
    color: #1a1a1a;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.2px;
  }
  .place-info .place-description {
    margin: 0 0 8px 0;
    color: #666;
    font-size: 13px;
  }
  .place-info .place-category {
    margin: 0 0 4px 0;
    color: #4f46e5;
    font-size: 12px;
    font-weight: 500;
  }
  .place-info .place-location {
    margin: 0 0 12px 0;
    color: #999;
    font-size: 12px;
  }
  .delete-btn {
    background: #dc2626;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    width: 100%;
    transition: background 0.2s ease;
    pointer-events: auto;
  }
  .delete-btn:hover {
    background: #b91c1c;
  }
  .custom-marker {
    width: 24px;
    height: 30px;
    cursor: pointer;
  }
  .custom-marker:hover {
    opacity: 0.8;
  }
`;

export const controlPanelStyles = `
  .places-controls {
    position: absolute !important;
    bottom: 20px !important;
    left: 20px !important;
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(10px) !important;
    border-radius: 10px !important;
    padding: 0 !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
    z-index: 1000 !important;
    width: 240px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    transition: all 0.3s ease !important;
    overflow: hidden !important;
    max-height: 80vh !important;
  }
  
  /* Expanded state for places list - NO UPWARD MOVEMENT */
  .places-controls.expanded {
    max-height: 70vh !important;
  }
  
  /* Places List Section */
  .places-list-section {
    padding: 12px !important;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
    max-height: 300px !important;
    overflow-y: auto !important;
    background: rgba(248, 248, 248, 0.3) !important;
  }
  
  .places-list-header {
    margin-bottom: 8px !important;
  }
  
  .places-list-header h3 {
    margin: 0 !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    color: #333 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
  }
  
  .places-list {
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
  }
  
  .place-item {
    padding: 8px !important;
    background: white !important;
    border-radius: 6px !important;
    border: 1px solid rgba(0, 0, 0, 0.05) !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
  }
  
  .place-item:hover {
    background: #f8f8f8 !important;
    border-color: rgba(0, 0, 0, 0.1) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
  }
  
  .place-item-main {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    margin-bottom: 2px !important;
  }
  
  .place-name {
    font-weight: 500 !important;
    font-size: 11px !important;
    color: #333 !important;
  }
  
  .place-category {
    font-size: 9px !important;
    background: rgba(0, 0, 0, 0.05) !important;
    color: #666 !important;
    padding: 2px 4px !important;
    border-radius: 3px !important;
    font-weight: 500 !important;
  }
  
  .place-address {
    font-size: 10px !important;
    color: #888 !important;
    line-height: 1.3 !important;
  }
  
  /* Loading and empty states */
  .loading-state, .empty-state {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important;
    color: #888 !important;
    font-size: 11px !important;
  }
  
  .loading-state {
    gap: 6px !important;
  }
  
  .spinner {
    width: 12px !important;
    height: 12px !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    border-top: 1px solid #333 !important;
    border-radius: 50% !important;
    animation: spin 1s linear infinite !important;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Main Controls Section */
  .main-controls {
    padding: 12px !important;
  }
  
  /* Primary Actions - Top level buttons */
  .primary-actions {
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    margin-bottom: 8px !important;
  }
  
  /* Add Place Form */
  .add-place-form {
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
    margin-top: 6px !important;
  }
  
  /* Button Styles - Back to minimal */
  .control-button {
    background: white !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    padding: 8px 12px !important;
    border-radius: 6px !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    font-weight: 500 !important;
    color: #1a1a1a !important;
    font-size: 12px !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
    margin-bottom: 4px !important;
  }
  
  .control-button:hover:not(:disabled) {
    background: #f8f8f8 !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
  }
  
  .control-button:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
    transform: none !important;
  }
  
  /* Button variants - simplified */
  .control-button.primary {
    background: white !important;
    color: #1a1a1a !important;
    border-color: rgba(0, 0, 0, 0.15) !important;
    font-weight: 600 !important;
  }
  
  .control-button.primary:hover:not(:disabled) {
    background: #f0f0f0 !important;
    border-color: rgba(0, 0, 0, 0.2) !important;
  }
  
  .control-button.active {
    background: #f0f0f0 !important;
    border-color: rgba(0, 0, 0, 0.2) !important;
    color: #000 !important;
  }
  
  .control-button.secondary {
    background: #f8f8f8 !important;
    color: #666 !important;
    border-color: rgba(0, 0, 0, 0.08) !important;
  }
  
  .control-button.secondary:hover:not(:disabled) {
    background: #f0f0f0 !important;
    color: #333 !important;
  }
  
  .control-button.success {
    background: #f0f8f0 !important;
    color: #2d5f2d !important;
    border-color: rgba(45, 95, 45, 0.2) !important;
    font-weight: 600 !important;
  }
  
  .control-button.success:hover:not(:disabled) {
    background: #e8f5e8 !important;
    border-color: rgba(45, 95, 45, 0.3) !important;
  }
  
  /* Input Styles - minimal */
  .control-input {
    width: 100% !important;
    padding: 6px 8px !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    border-radius: 4px !important;
    font-size: 11px !important;
    margin-bottom: 6px !important;
    background: white !important;
    color: #1a1a1a !important;
    box-sizing: border-box !important;
    transition: border-color 0.2s ease !important;
  }
  
  .control-input:focus {
    outline: none !important;
    border-color: rgba(0, 0, 0, 0.2) !important;
  }
  
  .control-input:disabled {
    background: #f9f9f9 !important;
    opacity: 0.6 !important;
  }
  
  .control-input::placeholder {
    color: #999 !important;
  }
  
  /* Status Display - minimal */
  .status-display {
    padding: 6px 8px !important;
    background: rgba(0, 0, 0, 0.03) !important;
    border-radius: 4px !important;
    font-size: 10px !important;
    font-weight: 500 !important;
    text-align: center !important;
    border: 1px solid rgba(0, 0, 0, 0.05) !important;
    margin-bottom: 6px !important;
  }
  
  /* Form Actions */
  .form-actions {
    display: flex !important;
    gap: 6px !important;
    margin-top: 4px !important;
  }
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    .places-controls {
      width: calc(100vw - 40px) !important;
      max-width: 280px !important;
    }
    
    .places-controls.expanded {
      transform: translateY(-150px) !important;
    }
  }
  
  /* Minimal scrollbar */
  .places-list-section::-webkit-scrollbar {
    width: 2px !important;
  }
  
  .places-list-section::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05) !important;
  }
  
  .places-list-section::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2) !important;
    border-radius: 1px !important;
  }
  
  .places-list-section::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3) !important;
  }
`;