const mongodb = require('models/mongodb');
const {
    handleError
} = require('../../models/FHIR/httpMessage');
const FHIR = require('../../models/FHIR/fhir/fhir').Fhir;
const { user } = require('../apiService');

/**
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 * @param {String} resourceType 
 * @returns 
 */
module.exports = async function(req, res, resourceType) {
    let doRes = function (code , item) {
        if (res.getHeader("content-type").includes("xml")) {
            let fhir = new FHIR();
            let xmlItem = fhir.objToXml(item);
            return res.status(code).send(xmlItem);
        }
        return res.status(code).send(item);
    }
    if (!user.checkTokenPermission(req, resourceType, "vread")) {
        return doRes(403,handleError.forbidden("Your token doesn't have permission with this API"));
    }
    let id = req.params.id;
    let version = req.params.version;
    try {
        let docs = await mongodb[`${resourceType}_history`].findOne({
            $and: [{
                    id: id
                },
                {
                    "meta.versionId": version
                }
            ]
        }).exec();
        if (docs) {
            let responseDoc = docs.getFHIRField();
            res.header('Last-Modified', new Date(responseDoc.meta.lastUpdated).toUTCString());
            return doRes(200 , responseDoc);
        }
        let errorMessage = `not found ${resourceType}/${id} with version ${version} in history`;
        let operationOutcomeError = handleError.exception(errorMessage);
        return doRes(404 , operationOutcomeError);
    } catch (e) {
        console.log(`api ${process.env.FHIRSERVER_APIPATH}/${resourceType}/:id has error, `, e)
        let operationOutcomeError = handleError.exception(e);
        return doRes(500 , operationOutcomeError);
    }
};