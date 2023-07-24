'use strict';
const router = require('express').Router();

const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');

const Whatsapp = new WhatsappCloudAPI({
    accessToken: process.env.Meta_WA_accessToken,
    senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
    WABA_ID: process.env.Meta_WA_wabaId,
});

const MedicationStore = require('./../utils/medication_store.js');
let Store = new MedicationStore();
const CustomerSession = new Map();

router.get('/meta_wa_callbackurl', (req, res) => {
    try {
        console.log('GET: Someone is pinging me!');

        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];

        if (
            mode &&
            token &&
            mode === 'subscribe' &&
            process.env.Meta_WA_VerifyToken === token
        ) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.error({ error });
        return res.sendStatus(500);
    }
});

router.post('/meta_wa_callbackurl', async (req, res) => {
    console.log('POST: Someone is pinging me!');
    try {
        let data = Whatsapp.parseMessage(req.body);

        if (data?.isMessage) {
            let incomingMessage = data.message;
            let recipientPhone = incomingMessage.from.phone; // extract the phone number of sender
            let recipientName = incomingMessage.from.name;
            let typeOfMsg = incomingMessage.type; // extract the type of message (some are text, others are images, others are responses to buttons etc...)
            let message_id = incomingMessage.message_id; // extract the message id

            // Start of medication reminder logic
            if (!CustomerSession.get(recipientPhone)) {
                CustomerSession.set(recipientPhone, {
                    medications: [],
                });
            }

            let addMedication = async ({ medicationDetails, recipientPhone }) => {
                let medication = await Store.addMedication(medicationDetails);
                if (medication.status === 'success') {
                    CustomerSession.get(recipientPhone).medications.push(medication.data);
                }
            };

            let listOfMedications = ({ recipientPhone }) => {
                return CustomerSession.get(recipientPhone).medications;
            };

            let clearMedications = ({ recipientPhone }) => {
                CustomerSession.get(recipientPhone).medications = [];
            };
            // End of medication reminder logic

            if (typeOfMsg === 'text_message') {
                await Whatsapp.sendSimpleButtons({
                    message: `Hey ${recipientName}, \nWelcome to TATA 1mg Health Coach!\nHow can I assist you today?`,
                    recipientPhone: recipientPhone,
                    listOfButtons: [
                        {
                            title: 'View my medications',
                            id: 'view_medications',
                        },
                        {
                            title: 'Add Medication',
                            id: 'add_medication',
                        },
                        {
                            title: 'Speak to a health coach',
                            id: 'speak_to_health_coach',
                        },
                    ].map((button) => ({
                        title: button.title.substring(0, 20),
                        id: button.id,
                    })),
                });
            }

            if (typeOfMsg === 'radio_button_message') {
                let selectionId = incomingMessage.list_reply.id;

                if (selectionId.startsWith('medication_')) {
                    let medication_id = selectionId.split('_')[1];
                    let medication = await Store.getMedicationById(medication_id);
                    const {
                        name,
                        dosage,
                        frequency,
                        instructions,
                    } = medication.data;

                    let text = `_Medication Name_: *${name.trim()}*\n\n\n`;
                    text += `_Dosage_: ${dosage.trim()}\n\n\n`;
                    text += `_Frequency_: ${frequency}\n`;
                    text += `_Instructions_: ${instructions}\n`;

                    await Whatsapp.sendText({
                        recipientPhone,
                        message: text,
                    });

                    await Whatsapp.sendSimpleButtons({
                        message: `What would you like to do next?`,
                        recipientPhone: recipientPhone,
                        message_id,
                        listOfButtons: [
                            {
                                title: 'Add another medication',
                                id: 'add_medication',
                            },
                            {
                                title: 'Speak to a health coach',
                                id: 'speak_to_health_coach',
                            },
                            {
                                title: 'View my medications',
                                id: 'view_medications',
                            },
                        ].map((button) => ({
                            title: button.title.substring(0, 20),
                            id: button.id,
                        })),
                    });
                }
            }

            if (typeOfMsg === 'simple_button_message') {
                let button_id = incomingMessage.button_reply.id;

                if (button_id === 'speak_to_health_coach') {
                    // Respond with a message to contact a health coach
                    await Whatsapp.sendText({
                        recipientPhone: recipientPhone,
                        message: `Not to worry, our health coach will contact you soon to assist you with any questions or concerns you may have.\n\nIn the meantime, take care and stay healthy!`,
                    });

                    await Whatsapp.sendContact({
                        recipientPhone: recipientPhone,
                        contact_profile: {
                            name: {
                                first_name: 'Health',
                                last_name: 'Coach',
                            },
                            phones: [
                                {
                                    phone: '+1 (555) 123-4567',
                                },
                            ],
                        },
                    });
                }

                if (button_id === 'view_medications') {
                    let medications = listOfMedications({ recipientPhone });

                    if (medications.length === 0) {
                        await Whatsapp.sendText({
                            recipientPhone: recipientPhone,
                            message: `You don't have any medications added yet. To add a medication, click on the "Add Medication" button.`,
                        });
                    } else {
                        let medicationListText = `Your Medications:\n\n`;

                        medications.forEach((medication, index) => {
                            let serial = index + 1;
                            medicationListText += `\n#${serial}: ${medication.name}`;
                        });

                        await Whatsapp.sendText({
                            recipientPhone: recipientPhone,
                            message: medicationListText,
                        });
                    }

                    await Whatsapp.sendSimpleButtons({
                        recipientPhone: recipientPhone,
                        message: `What would you like to do next?`,
                        message_id,
                        listOfButtons: [
                            {
                                title: 'Add Medication',
                                id: 'add_medication',
                            },
                            {
                                title: 'Speak to a health coach',
                                id: 'speak_to_health_coach',
                            },
                        ].map((button) => ({
                            title: button.title.substring(0, 20),
                            id: button.id,
                        })),
                    });
                }

                if (button_id === 'add_medication') {
                    await Whatsapp.sendText({
                        recipientPhone: recipientPhone,
                        message: `To add a medication, please provide the following information in the format:\n\nMedication Name: [Name]\nDosage: [Dosage]\nFrequency: [Frequency]\nInstructions: [Instructions]`,
                    });
                }

                if (button_id === 'print_prescription') {
                    // ...
                }
            }

            await Whatsapp.markMessageAsRead({
                message_id,
            });
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error({ error });
        return res.sendStatus(500);
    }
});

module.exports = router;
