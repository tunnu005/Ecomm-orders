import { pool } from "./dbconnection";
import opencage from 'opencage-api-client';

interface order {
    order_id: number,
    address_id: number,
    user_id: number,
    product_id: number,
    total_amount: number,
    quantity: number,
    need_otp: boolean,
    order_date: Date,
    payment_status: string,
    shipping_status: string,
    payment_method: string,
    notes: string,
    taxt: number,
    order_status: string,
    delivery_charge: number,
}

export const checkUser = async (user_id: number) => {
    try {
        const query = `SELECT COUNT(*) FROM users WHERE user_id=$1`
        const result = await pool.query(query, [user_id]);
        if (result.rows[0].count === 0) {
            throw new Error('User not found')
        }
    } catch (error) {
        console.error(error);
        throw new Error('User not found')
    }
}


export const checkProduct = async (product_id: number) => {
    try {
        const query = `SELECT COUNT(*) FROM product WHERE product_id`
        const result = await pool.query(query, [product_id]);
        if (result.rows[0].count === 0) {
            throw new Error('Product not found')
        }
    } catch (error) {
        console.error(error);
        throw new Error('Product not found')
    }
}


export const checkAddress = async (address_id: number) => {
    try {
        const query = `SELECT COUNT(*) FROM address WHERE address_id=$1`
        const result = await pool.query(query, [address_id]);
        if (result.rows[0].count === 0) {
            throw new Error('Address not found')
        }
    } catch (error) {
        console.error(error);
        throw new Error('Address not found')
    }
}

export const getCoordinates = async (address: string) => {
    const apiKey = 'a1536c7cd4644d9a925f4a01cebef8bf';
    const response = await opencage.geocode({ q: address, key: apiKey });

    if (response.results.length > 0) {
        const { lat, lng } = response.results[0].geometry;
        // return { latitude: lat, longitude: lng };
        console.log("latitude : ", lat, "longitude : ", lng);

    } else {
        throw new Error('No coordinates found');
    }
};


export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

export const finddeliveryPartner = async (order_id: number): Promise<number> => {
    try {
        const query = `SELECT dp.partner_id as partner_id FROM "orders" o JOIN address ad ON o.address_id = ad.address_id JOIN "delivery_partners" dp ON ad.pincode = dp.pincode WHERE o.order_id = $1 and dp.availability_status = 'available'`
        const result = await pool.query(query, [order_id]);
        if (result.rows.length === 0) {
            throw new Error('No delivery partner found')
        }
        return result.rows[0].partner_id;

    } catch (error) {
        console.error(error);
        throw new Error('Error finding delivery partner')
    }
}

export const getOrder = async (order_id: number): Promise<order> => {

    try {
        const query = `SELECT * FROM orders where order_id = $1`
        const result = await pool.query(query, [order_id]);
        if (result.rows.length === 0) {
            throw new Error('Order not found')
        }
        return result.rows[0] as order;
    } catch (error) {
        console.error(error);
        throw new Error('Error fetching order')
    }
}

export const getOrderId = async (user_id: number): Promise<number> => {
    try {
        const query = `SELECT o.order_id from order o join users u on o.user_id = u.user_id where user_id = $1`
        const result = await pool.query(query, [user_id]);
        if (result.rows.length === 0) {
            throw new Error('No order found')
        }
        return result.rows[0].order_id;
    } catch (error) {
        console.error(error);
        throw new Error('Error fetching order id')
    }
}

export const getAssignmentId = async (order_id: number): Promise<number> => {
    try {
        const query = `SELECT assignment_id FROM delivery_assignments where order_id = $1`
        const result = await pool.query(query, [order_id])
        if (result.rows.length === 0) {
            throw new Error('No delivery assignment found')
        }
        return result.rows[0].assignment_id;
    } catch (error) {
        throw new Error('Error getting delivery assignment id')
    }
}
