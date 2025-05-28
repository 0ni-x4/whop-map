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
    padding: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
    z-index: 1 !important;
    width: 240px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
  }
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
  .control-button:hover {
    background: #f8f8f8 !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
  }
  .control-button.active {
    background: #f0f0f0 !important;
    border-color: rgba(0, 0, 0, 0.15) !important;
    color: #000 !important;
  }
  .control-input {
    width: 100% !important;
    padding: 6px 8px !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    border-radius: 4px !important;
    font-size: 11px !important;
    margin-bottom: 6px !important;
    background: white !important;
    box-sizing: border-box !important;
  }
  .control-input::placeholder {
    color: #999 !important;
  }
  .control-hint {
    font-size: 10px !important;
    color: #666 !important;
    margin-bottom: 8px !important;
    text-align: center !important;
  }
  .control-status {
    font-size: 10px !important;
    color: #10b981 !important;
    margin-bottom: 8px !important;
    text-align: center !important;
  }
  .control-actions {
    display: flex !important;
    gap: 6px !important;
    margin-top: 6px !important;
  }
`;