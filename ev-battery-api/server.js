const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const channelName = 'mychannel';
const chaincodeName = 'evbattery';
const walletPath = path.join(__dirname, 'wallet');
const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');

async function getContract() {
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const identity = await wallet.get('appUser');
    if (!identity) {
        throw new Error('An identity for the user "appUser" does not exist in the wallet.');
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'appUser',
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork(channelName);
    return network.getContract(chaincodeName);
}

// ၁။ MintMinedMaterials (ကုန်ကြမ်းသွင်းခြင်း)
app.post('/api/mint', async (req, res) => {
    try {
        const { id, source, carbonEmission } = req.body;
        const contract = await getContract();
        await contract.submitTransaction('MintMinedMaterials', id, source, String(carbonEmission));
        res.json({ success: true, message: "Battery " + id + " mined materials minted successfully from " + source });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ၂။ ManufactureBattery (ဘက်ထရီထုတ်လုပ်ခြင်း - အသစ်ထည့်ထားသည်)
app.post('/api/manufacture', async (req, res) => {
    try {
        const { id, manufacturerName, addedCarbon } = req.body;
        const contract = await getContract();
        await contract.submitTransaction('ManufactureBattery', id, manufacturerName, String(addedCarbon));
        res.json({ success: true, message: "Battery " + id + " manufactured successfully by " + manufacturerName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ၃။ LinkVehicle (ကားနှင့်ချိတ်ဆက်ခြင်း)
app.post('/api/transfer', async (req, res) => {
    try {
        const { id, vin } = req.body;
        const contract = await getContract();
        await contract.submitTransaction('LinkVehicle', id, vin);
        res.json({ success: true, message: "Battery " + id + " linked to Vehicle VIN " + vin });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ၄။ RecycleBattery (ဖျက်သိမ်းခြင်း)
app.post('/api/recycle', async (req, res) => {
    try {
        const { id } = req.body;
        const contract = await getContract();
        await contract.submitTransaction('RecycleBattery', id);
        res.json({ success: true, message: "Battery " + id + " marked as recycled." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ၅။ ReadBattery (အချက်အလက်ကြည့်ရှုခြင်း)
app.get('/api/query/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const contract = await getContract();
        const result = await contract.evaluateTransaction('ReadBattery', id);
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log("API Server is running on http://0.0.0.0:" + PORT);
});
