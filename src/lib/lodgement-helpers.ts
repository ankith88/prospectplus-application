export interface LodgementPoint {
  depotId: string;
  ncl_id?: string;
  name: string;
  ncl_name?: string;
  suburb: string;
  postcode: string;
  state: string;
  address?: string;
  operators: string[];
  op_primary_id?: string[];
  operatorId?: string;
  matchedLocation?: any;
}

/**
 * Robustly parses lodgement points (which may be JSON strings, objects, or arrays)
 * and enriches them with Partner Location details (matched by ncl_name, e.g. 'Kennards - Moore Park', or depotId/ncl_id)
 * and Operator names (matched by op_primary_id against operators collection).
 */
export function parseAndEnrichLodgementPoints(
  pts: any,
  partnerLocations: any[] = [],
  operatorsList: any[] = []
): LodgementPoint[] {
  if (!pts) return [];

  let parsed: any = pts;

  // Handle JSON string parsing (including nested JSON string encoding)
  if (typeof pts === 'string') {
    const trimmed = pts.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed.trim());
      }
    } catch (err) {
      console.warn('Failed to parse lodgement points JSON string:', err);
      return [];
    }
  }

  let arrayData: any[] = [];
  if (Array.isArray(parsed)) {
    arrayData = parsed.flat();
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.data)) {
      arrayData = parsed.data.flat();
    } else if (parsed.depotId || parsed.depot_id || parsed.depot || parsed.ncl_id || parsed.name || parsed.ncl_name) {
      arrayData = [parsed];
    } else {
      const values = Object.values(parsed);
      if (values.length > 0) {
        arrayData = values.flat();
      }
    }
  }

  // Create lookup maps for fast matching
  // 1. Partner Locations maps: by name/ncl_name (normalized) and by internalId/id/ncl_id
  const locationByNameMap = new Map<string, any>();
  const locationByIdMap = new Map<string, any>();

  partnerLocations.forEach((loc) => {
    if (loc.name) {
      locationByNameMap.set(String(loc.name).trim().toLowerCase(), loc);
    }
    if (loc.ncl_name) {
      locationByNameMap.set(String(loc.ncl_name).trim().toLowerCase(), loc);
    }
    const id = String(loc.internalId || loc.id || loc.ncl_id || '');
    if (id) {
      locationByIdMap.set(id.toLowerCase(), loc);
    }
  });

  // 2. Operators map: by internalId, id, op_primary_id -> display name
  const operatorMap = new Map<string, string>();
  operatorsList.forEach((op) => {
    const fullName = `${op.givenNames || op.givenName || ''} ${op.surname || ''}`.trim() || op.name || op.operatorName || '';
    if (op.internalId) operatorMap.set(String(op.internalId).toLowerCase(), fullName || String(op.internalId));
    if (op.id) operatorMap.set(String(op.id).toLowerCase(), fullName || String(op.id));
    if (op.op_primary_id) {
      if (Array.isArray(op.op_primary_id)) {
        op.op_primary_id.forEach((pid: any) => operatorMap.set(String(pid).toLowerCase(), fullName || String(pid)));
      } else {
        operatorMap.set(String(op.op_primary_id).toLowerCase(), fullName || String(op.op_primary_id));
      }
    }
  });

  return arrayData.map((pt) => {
    if (!pt || typeof pt !== 'object') {
      return {
        depotId: '',
        name: '',
        suburb: '',
        postcode: '',
        state: '',
        operators: []
      };
    }

    const rawNclId = String(pt?.ncl_id || pt?.depotId || pt?.depot_id || pt?.depot || pt?.id || pt?.internalId || '');
    const rawNclName = String(pt?.ncl_name || pt?.name || pt?.depot || '').trim();

    // Primary match: by ncl_name (e.g. 'Kennards - Moore Park')
    // Secondary match: by ncl_id / depotId
    const matchedLocation =
      (rawNclName ? locationByNameMap.get(rawNclName.toLowerCase()) : null) ||
      (rawNclId ? locationByIdMap.get(rawNclId.toLowerCase()) : null);

    const name = rawNclName || matchedLocation?.name || rawNclId || 'Unknown Depot';
    let suburb = pt?.suburb || matchedLocation?.suburb || '';
    let postcode = pt?.postcode || pt?.post_code || pt?.zip || matchedLocation?.postCode || matchedLocation?.postcode || '';
    let state = pt?.state || matchedLocation?.state || '';
    let address = pt?.ncl_address || matchedLocation?.address1 || matchedLocation?.address || '';

    // Fallback: Parse ncl_address if suburb, state or postcode are missing
    if ((!suburb || !state || !postcode) && address) {
      const parts = String(address).split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const statePostMatch = lastPart.match(/([A-Z]{2,3})?\s*-?\s*(\d{4})/i);
        if (statePostMatch) {
          if (!state && statePostMatch[1]) state = statePostMatch[1].toUpperCase();
          if (!postcode && statePostMatch[2]) postcode = statePostMatch[2];
        }
        if (!suburb && parts.length >= 2) {
          suburb = parts[parts.length - 2];
        }
      }
    }

    // Extract operator IDs from op_primary_id or operators field
    let rawOpIds: string[] = [];
    const opRaw = pt?.op_primary_id ?? pt?.operators ?? pt?.operatorId ?? pt?.operator_id ?? pt?.operator;
    if (Array.isArray(opRaw)) {
      rawOpIds = opRaw.map((o) => String(o).trim());
    } else if (typeof opRaw === 'string' && opRaw) {
      try {
        const parsedOps = JSON.parse(opRaw);
        if (Array.isArray(parsedOps)) {
          rawOpIds = parsedOps.map((o) => String(o).trim());
        } else {
          rawOpIds = [opRaw.trim()];
        }
      } catch {
        rawOpIds = opRaw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (typeof opRaw === 'number') {
      rawOpIds = [String(opRaw)];
    }

    // Resolve operator IDs using operatorMap
    const resolvedOperatorNames = rawOpIds.map((opId) => {
      const foundName = operatorMap.get(opId.toLowerCase());
      return foundName || opId;
    });

    return {
      depotId: rawNclId,
      ncl_id: rawNclId,
      ncl_name: rawNclName,
      name,
      suburb,
      postcode,
      state,
      address,
      op_primary_id: rawOpIds,
      operators: resolvedOperatorNames,
      operatorId: rawOpIds[0] || '',
      matchedLocation
    };
  });
}
