import { pool } from "./dbconnection";
import { calculateDistance, checkAddress, checkProduct, checkUser, getOrder } from "./utilities";


interface coordinates {
    latitude: number;
    longitude: number;
}




//create order
export const createorder = async(address_id:number,user_id:number,product_id:number,total_amount:number,quantity:number,need_otp:boolean,order_date:Date,payment_status:string,payment_method:string,notes:string,taxt:number,delivery_charge:number):Promise<number> =>{
    try {
        await checkUser(user_id)
        await checkProduct(product_id)
        await checkAddress(address_id)

        const query = `
        INSERT INTO "orders" 
        ("address_id", "user_id", "product_id", "total_amount", "quantity", "need_otp", "order_date", "payment_status", "shipping_status", "payment_method", "notes", "taxt", "order_status","delivery_charge")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING order_id`
        const values = [address_id, user_id, product_id, total_amount, quantity, need_otp, order_date, payment_status, "pending", payment_method, notes, taxt, "placed",delivery_charge];
        const result = await pool.query(query, values);

        if(result.rowCount === 0){
            throw new Error('Failed to create order')
        }
        return result.rows[0].order_id
    } catch (error) {
        console.error(error);
        throw new Error('Error creating order')
    }
}

export const loggingStatusHistory = async(order_id:number,status:string)=>{
    try {
        const query = `INSERT INTO "order_status_history"
        ("order_id", "status","timestamp")
        VALUES ($1,$2,NOW())
        `

        const values = [order_id, status];
        await pool.query(query, values);
    } catch (error) {
        console.error(error);
        throw new Error('Error logging status history')
    }
}

export const confirmSeller = async (order_id: number): Promise<number> => {
    try {
        // Fetch product_id from the order
        const product = await getOrder(order_id);
        const product_id = product.product_id;

        // Get seller_id using the product_id
        const query1 = `
            SELECT st.seller_id 
            FROM product p 
            JOIN storefronts st ON st.storefront_id = p.storefront_id 
            WHERE p.product_id = $1
        `;
        const sellerResult = await pool.query(query1, [product_id]);

        // Ensure seller exists
        if (sellerResult.rows.length === 0) {
            throw new Error('Seller not found for this product');
        }
        const seller_id = sellerResult.rows[0].seller_id;

        // Insert into seller_confirmation table
        const query2 = `
            INSERT INTO seller_confirmation (seller_id, status,order_id)
            VALUES ($1, $2,$3) 
            RETURNING confirmation_id
        `;
        const confirmationResult = await pool.query(query2, [seller_id, "pending",order_id]);

        // Ensure confirmation_id is returned
        if (confirmationResult.rows.length === 0) {
            throw new Error('Failed to insert seller confirmation');
        }

        return confirmationResult.rows[0].confirmation_id;
    } catch (error) {
        console.error(error);
        throw new Error('Error confirming seller');
    }
};

export const updateConfirmSeller = async(confirmation_id:number,status:string)=>{
    try {
        const query = `UPDATE seller_confirmation SET status = $1 WHERE confirmation_id = $2`
        await pool.query(query, [status, confirmation_id]);
    } catch (error) {
        console.error(error);
        throw new Error('Error updating seller confirmation')
    }
}

// export const calculateDeliverycharge = async(order_id:number):Promise<number>=>{
//     try {
        
//         const query = `SELECT a.latitude as lat1, a.longitude as lng1 FROM "orders" o JOIN "address" a ON a.address_id = o.address_id where a.order_id = $1`;

//         const result = await pool.query(query, [order_id]);
//         if(result.rows.length===0){
//             throw new Error('Order not found')
//         }
//         const { lat1, lng1 } = result.rows[0];

//         const query2 = `SELECT a.latitude as lat2, a.longitude as lng2 FROM "orders" o JOIN "product" p ON o.product_id = p.product_id JOIN "storefronts" s ON p.storefront_id = s.storefront_id WHERE order_id = $1;`
//         const result2 = await pool.query(query,[order_id])

//         const { lat2, lng2 } = result2.rows[0];

//         const distance =calculateDistance(lat1, lng1, lat2, lng2);
        
//         const deliverycharge = distance * 5;
//         return deliverycharge;

//     } catch (error) {
//         console.error(error);
//         throw new Error('Error calculating delivery charge')
//     }
// }


export const deliveryCharge = async(address_id:number):Promise<number>=>{
    try {
        const query = `SELECT dz.base_charge as base_charge FROM address ad  JOIN delivery_zones dz ON dz.pincode = ad.pincode WHERE address_id =$1`
        const result = await pool.query(query,[address_id]);
        if(result.rows.length===0){
            throw new Error('Address not found')
        }
        return result.rows[0].base_charge;
    } catch (error) {
        console.error(error)
        throw new Error('Error calculating delivery charge')
    }
}


export const deliveryassignment = async(order_id:number,partner_id:number,estimated_delivery_time:Date,delivery_stage:string):Promise<number>=>{
    try {
        const query = `INSERT INTO "delivery_assignments"
        ("order_id", "partner_id", "status", "estimated_delivery_time", "delivery_stage")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING assignment_id
        `
        const values = [order_id, partner_id, 'assigned', estimated_delivery_time, delivery_stage];

        const result = await pool.query(query, values);
        return result.rows[0].assignment_id
    } catch (error) {
        console.error(error);
        throw new Error('Error assigning delivery partner')
    }
}


export const deliveryPickup = async(assignment_id:number,pickup_time:Date,partner_id:number)=>{
    try {
        const query = `INSERT INTO "delivery_pickup" 
        (assignment_id,pickup_time,partner_id,pickup_status)
        VALUES ($1, $2, $3, $4)
        ` 

        const values = [assignment_id,pickup_time,partner_id, 'assigned'];

        await pool.query(query, values);
    } catch (error) {
        console.error(error)
        throw new Error("error in delivery pickup")
    }
}

export const updatepickup = async(status:string,assignment_id:number)=>{
    try {
        const query = `UPDATE "delivery_pickup" 
        SET "pickup_status" = $1
        WHERE assignment_id =$2`

        await pool.query(query,[status,assignment_id])
    } catch (error) {
        console.error(error)
        throw new Error("error in updating pickup status")
    }
}


export const updateassignment = async(status:string,assignment_id:number,delivery_stage:string)=>{
    try {
        const query = `UPDATE "delivery_assignment" 
        SET "status" = $1, "delivery_stage" = $3 where assignment_id = $2;
        `

        await pool.query(query,[status, assignment_id, delivery_stage])
    } catch (error) {
        console.error(error)
        throw new Error("error in updating assignment status")
    }
}


export const createConfirmation = async(assignment_id:number) =>{
    try {
        const query = `
        INSERT INTO "delivery_confirmation"
        ("assignment_id", "confirmation_status")
        values ($1, $2);
        `

        await pool.query(query,[assignment_id,'pending'])
    } catch (error) {
        console.error(error)
        throw new Error("error in creating confirmation")
    }
}

export const updateConfirmation = async(assignment_id:number,status:string) =>{
    try {
        const query = `UPDATE delivery_confirmation SET confirmation_status = $1, confirmation_time = NOW() WHERE assignment_id = $2`
        await pool.query(query,[status,assignment_id])
    } catch (error) {
        console.error(error)
        throw new Error("error in updating confirmation")
    }
}

export const getDeliveryStatus = async(order_id:number):Promise<string>=>{
    try {
        const query = `SELECT status from order_status_history where order_id = $1 ORDER BY timestamp DESC LIMIT 1`
        const result = await pool.query(query,[order_id])
        if(result.rowCount === 0){
            throw new Error('No delivery status found')
        }

        return result.rows[0].status;
    } catch (error) {
        console.error(error)
        throw new Error("error in getting delivery status")
    }
}

