/**
 * Aquinos Frios - NF-e XML Reader & Parser
 * Handles parsing standard Brazilian NF-e (Nota Fiscal Eletrônica) XML files
 * and generates realistic sample XMLs for instant testing.
 */

import { XmlImportItem } from '../types';

export interface ParsedNFe {
  nfeNumber: string;
  emissionDate: string;
  supplierName: string;
  supplierCnpj: string;
  totalValue: number;
  items: XmlImportItem[];
}

export function parseNFeXml(xmlText: string): ParsedNFe {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for parse errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Arquivo XML inválido ou corrompido.');
  }

  // Extract NFe Number
  const nNF = xmlDoc.querySelector('ide > nNF')?.textContent || 'S/N';

  // Extract Emission Date
  const dhEmi = xmlDoc.querySelector('ide > dhEmi')?.textContent || 
                xmlDoc.querySelector('ide > dEmi')?.textContent || 
                new Date().toISOString();

  // Extract Supplier Info
  const emitName = xmlDoc.querySelector('emit > xNome')?.textContent || 
                   xmlDoc.querySelector('emit > xFant')?.textContent || 
                   'Fornecedor Desconhecido';
  const emitCnpj = xmlDoc.querySelector('emit > CNPJ')?.textContent || '';

  // Extract Total Value
  const vNFStr = xmlDoc.querySelector('total > ICMSTot > vNF')?.textContent || '0';
  const totalValue = parseFloat(vNFStr.replace(',', '.')) || 0;

  // Extract Items (<det>)
  const detNodes = xmlDoc.querySelectorAll('det');
  const items: XmlImportItem[] = [];

  detNodes.forEach((det) => {
    const prod = det.querySelector('prod');
    if (!prod) return;

    const cProd = prod.querySelector('cProd')?.textContent || '';
    const xProd = prod.querySelector('xProd')?.textContent || 'Produto sem nome';
    const cEAN = prod.querySelector('cEAN')?.textContent;
    const uCom = prod.querySelector('uCom')?.textContent || 'UN';
    const qComStr = prod.querySelector('qCom')?.textContent || '1';
    const vUnComStr = prod.querySelector('vUnCom')?.textContent || '0';
    const vProdStr = prod.querySelector('vProd')?.textContent || '0';

    // Lot / Expiration info if available (<rastro>)
    const nLote = prod.querySelector('rastro > nLote')?.textContent || undefined;
    const dVal = prod.querySelector('rastro > dVal')?.textContent || undefined;

    const qCom = parseFloat(qComStr.replace(',', '.')) || 1;
    const vUnCom = parseFloat(vUnComStr.replace(',', '.')) || 0;
    const vProd = parseFloat(vProdStr.replace(',', '.')) || 0;

    items.push({
      cProd,
      xProd,
      cEAN: (cEAN && cEAN !== 'SEM GTIN') ? cEAN : undefined,
      uCom: uCom.toUpperCase(),
      qCom,
      vUnCom,
      vProd,
      nLote,
      dVal,
    });
  });

  return {
    nfeNumber: nNF,
    emissionDate: dhEmi,
    supplierName: emitName,
    supplierCnpj: emitCnpj,
    totalValue,
    items,
  };
}

/**
 * Generates a realistic sample NF-e XML for testing cold cuts import
 */
export function generateSampleNFeXml(): string {
  const nfeNum = Math.floor(100000 + Math.random() * 900000);
  const now = new Date();
  const expiry30 = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const expiry60 = new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0];
  const expiry90 = new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNfe Id="NFe3526071234567800019555001000${nfeNum}1001234567">
      <ide>
        <cUF>35</cUF>
        <cNF>1234567</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${nfeNum}</nNF>
        <dhEmi>${now.toISOString()}</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>DISTRIBUIDORA DE FRIOS SADIA &amp; PERDIGAO S.A.</xNome>
        <xFant>SADIA DISTRIBUICAO</xFant>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>SAD-1002</cProd>
          <cEAN>7891025100201</cEAN>
          <xProd>QUEIJO MUSSARELA SOLTINHO SADIA</xProd>
          <NCM>04061010</NCM>
          <uCom>CX</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>480.00</vUnCom>
          <vProd>2400.00</vProd>
          <rastro>
            <nLote>LOTE-MUS-982</nLote>
            <dVal>${expiry60}</dVal>
          </rastro>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>PER-2005</cProd>
          <cEAN>7891025200505</cEAN>
          <xProd>PRESUNTO COZIDO FATIADO PERDIGAO</xProd>
          <NCM>16010000</NCM>
          <uCom>PC</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>115.00</vUnCom>
          <vProd>1150.00</vProd>
          <rastro>
            <nLote>LOTE-PRE-441</nLote>
            <dVal>${expiry30}</dVal>
          </rastro>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>SEA-3010</cProd>
          <cEAN>7891025301007</cEAN>
          <xProd>LINGUICA CALABRESA DEFUMADA SEARA</xProd>
          <NCM>16010000</NCM>
          <uCom>FD</uCom>
          <qCom>8.0000</qCom>
          <vUnCom>220.00</vUnCom>
          <vProd>1760.00</vProd>
          <rastro>
            <nLote>LOTE-CAL-102</nLote>
            <dVal>${expiry90}</dVal>
          </rastro>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>5310.00</vProd>
          <vNF>5310.00</vNF>
        </ICMSTot>
      </total>
    </infNfe>
  </NFe>
</nfeProc>`;
}
