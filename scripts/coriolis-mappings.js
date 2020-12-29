
const _ = require('lodash');

module.exports.SHIP_CORIOLIS_TO_FD = {
    'adder': 'Adder',
    'anaconda': 'Anaconda',
    'asp': 'Asp',
    'asp_scout': 'Asp_Scout',
    'beluga': 'BelugaLiner',
    'cobra_mk_iii': 'CobraMkIII',
    'cobra_mk_iv': 'CobraMkIV',
    'imperial_cutter': 'Cutter',
    'diamondback_explorer': 'DiamondBackXL',
    'diamondback': 'DiamondBack',
    'dolphin': 'Dolphin',
    'eagle': 'Eagle',
    'imperial_courier': 'Empire_Courier',
    'imperial_eagle': 'Empire_Eagle',
    'imperial_clipper': 'Empire_Trader',
    'federal_corvette': 'Federation_Corvette',
    'federal_dropship': 'Federation_Dropship',
    'federal_assault_ship': 'Federation_Dropship_MkII',
    'federal_gunship': 'Federation_Gunship',
    'fer_de_lance': 'FerDeLance',
    'hauler': 'Hauler',
    'keelback': 'Independant_Trader',
    'krait_mkii': 'Krait_MkII',
    'mamba': 'Mamba',
    'krait_phantom': 'Krait_Light',
    'orca': 'Orca',
    'python': 'Python',
    'sidewinder': 'SideWinder',
    'type_6_transporter': 'Type6',
    'type_7_transport': 'Type7',
    'type_9_heavy': 'Type9',
    'type_10_defender': 'Type9_Military',
    'alliance_chieftain': 'TypeX',
    'alliance_crusader': 'TypeX_2',
    'alliance_challenger': 'TypeX_3',
    'viper': 'Viper',
    'viper_mk_iv': 'Viper_MkIV',
    'vulture': 'Vulture'
};

module.exports.PROP_CORIOLIS_TO_FD = {
    'ammo': 'ammomaximum',
    'angle': [
        {
            'for': /^Int_Sensors/i,
            'val': 'sensortargetscanangle',
        },
        {
            'for': /^Hpt_[a-zA-Z]+Scanner/i,
            'val': 'maxangle',
        }
    ],
    'boot': 'boottime',
    'breachdmg': 'breachdamage',
    'breachmax': 'maxbreachchance',
    'breachmin': 'minbreachchance',
    'brokenregen': 'brokenregenrate',
    'burst': 'burstsize',
    'burstrof': 'burstrateoffire',
    'causres': 'causticresistance',
    'clip': 'ammoclipsize',
    'distdraw': [
        {
            'for': /Hpt_/i,
            'val': 'distributordraw',
        },
        {
            'for': /Int_ShieldGenerator/i,
            'val': 'energyperregen',
        },
    ],
    'dpe': 'damageperenergy',
    'dps': 'damagepersecond',
    'duration': 'shieldbankduration',
    'eff': 'heatefficiency',
    'engcap': 'enginescapacity',
    'engrate': 'enginesrecharge',
    'eps': 'energypersecond',
    'explres': 'explosiveresistance',
    'facinglimit': 'fsdinterdictorfacinglimit',
    'falloff': 'damagefalloffrange',
    'fireint': 'fireintervall',
    'hps': 'heatpersecond',
    'hullreinforcement': 'defencemodifierhealthaddition',
    'hullboost': 'defencemodifierhealthmultiplier',
    'kinres': 'kineticresistance',
    'maxmass': [
        {
            'for': /^Int_Engine/i,
            'val': 'enginemaximalmass',
        },
        {
            'for': /^Int_ShieldGenerator/i,
            'val': 'shieldgenmaximalmass',
        },
    ],
    'maxmul': [
        {
            'for': /^Int_Engine/i,
            'val': 'enginemaxperformance',
        },
        {
            'for': /^Int_ShieldGenerator/i,
            'val': 'shieldgenmaxstrength',
        },
    ],
    'minmass': [
        {
            'for': /^Int_Engine/i,
            'val': 'engineminimalmass',
        },
        {
            'for': /^Int_ShieldGenerator/i,
            'val': 'shieldgenminimalmass',
        },
    ],
    'minmul': [
        {
            'for': /^Int_Engine/i,
            'val': 'engineminperformance',
        },
        {
            'for': /^Int_ShieldGenerator/i,
            'val': 'shieldgenminstrength',
        },
    ],
    'optmass': [
        {
            'for': /^Int_Engine/i,
            'val': 'engineoptimalmass',
        },
        {
            'for': /^Int_HyperDrive/i,
            'val': 'fsdoptimalmass',
        },
        {
            'for': /^Int_ShieldGenerator/i,
            'val': 'shieldgenoptimalmass',
        },
    ],
    'optmul': [
        {
            'for': /^Int_Engine/i,
            'val': 'engineoptperformance',
        },
        {
            'for': /^Int_ShieldGenerator/i,
            'val': 'shieldgenstrength',
        },
    ],
    'pgen': 'powercapacity',
    'piercing': 'armourpenetration',
    'power': 'powerdraw',
    'proberadius': 'dss_patchradius',
    'range': [
        {
            'for': /^Int_Sensors/i,
            'val': 'range',
        },
        {
            'for': /^Hpt_[a-zA-Z]+Scanner/i,
            'val': 'scannerrange',
        },
        {
            'for': /^(Hpt_)|(Int_DroneControl_)/i,
            'val': 'maximumrange',
        },
    ],
    'ranget': 'fsdinterdictorrange',
    'regen': 'regenrate',
    'reload': 'reloadtime',
    'rof': 'rateoffire',
    'scantime': 'scannertimetoscan',
    'shieldaddition': 'defencemodifiershieldaddition',
    'shieldreinforcement': 'shieldbankreinforcement',
    'spinup': 'shieldbankspinup',
    'sdps': 'sustaineddamagepersecond',
    'shieldboost': 'defencemodifiershieldmultiplier',
    'syscap': 'systemscapacity',
    'sysrate': 'systemsrecharge',
    'thermload': [
        {
            'for': /^Hpt_/i,
            'val': 'thermalload'
        },
        {
            'for': /^Int_/i,
            'val': 'shieldbankheat'
        },
    ],
    'thermres': 'thermicresistance',
    'wepcap': 'weaponscapacity',
    'weprate': 'weaponsrecharge',
};

/**
 * Following regexes will parse modules for the module cache. The function which
 * create the cache expects matching group 1 to represent the class of the item
 * and matching group 2 to represent the rating. If groups is set, matching
 * group groups[0] will represent the class and groups[1] the rating.
 * If class and/or rating aren't given, "" will be default value.
 */
module.exports.MODULES_REGEX = {
    AbrasionBlaster: {
        r: /^Hpt_Mining_AbrBlstr_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    AdvancedDockingComputer: /^Int_DockingComputer_Advanced$/i,
    Armour: /^(\S+)_Armour_(\S+)$/i,
    Powerplant: /^Int_PowerPlant_Size(\d)_Class(\d)$/i,
    GuardianPowerplant: /^Int_GuardianPowerplant_Size(\d)$/i,
    Thrusters: /^Int_Engine_Size(\d)_Class(\d)$/i,
    EnhancedThrusters: /^Int_Engine_Size(\d)_Class(\d)_Fast$/i,
    FSD: /^Int_HyperDrive_Size(\d)_Class(\d)$/i,
    LifeSupport: /^Int_LifeSupport_Size(\d)_Class(\d)$/i,
    PowerDistributor: /^Int_PowerDistributor_Size(\d)_Class(\d)$/i,
    GuardianPowerDistributor: /^Int_GuardianPowerDistributor_Size(\d)$/i,
    Sensors: /^Int_Sensors_Size(\d)_Class(\d)$/i,
    FuelTank: /^Int_FuelTank_Size(\d)_Class(\d)$/i,
    AdvancedPlasmaAcc: {
        r: /^Hpt_PlasmaAccelerator_([^_]+)_([^_]+)_Advanced$/i,
        groups: [2, 1],
    },
    AFM: /^Int_Repairer_Size(\d)_Class(\d)$/i,
    AXDumbfireRack: {
        r: /Hpt_ATDumbfireMissile_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    AXMultiCannon: {
        r: /^Hpt_ATMultiCannon_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    BeamLaser: {
        r: /^Hpt_BeamLaser_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    BiWeaveShieldGen: /^Int_ShieldGenerator_Size(\d)_Class(\d)_Fast$/i,
    BurstLaser: {
        r: /^Hpt_PulseLaserBurst_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    PassengerCabins: /^Int_PassengerCabin_Size(\d)_Class(\d)$/i,
    Cannon: {
        r: /^Hpt_Cannon_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    CargoRack: /^Int_CargoRack_Size(\d)_Class1$/i,
    ChaffLauncher: /^Hpt_ChaffLauncher_Tiny$/i,
    CollectorLimpet: /^Int_DroneControl_Collection_Size(\d)_Class(\d)$/i,
    CorrosionResistantCargoRack: /^Int_CorrosionProofCargoRack_Size(\d)_Class(\d)$/i,
    CytoScrambler: {
        r: /^Hpt_PulseLaserBurst_([^_]+)_([^_]+)_Scatter$/i,
        groups: [2, 1],
    },
    DecontaminationLimpet: /^Int_DroneControl_Decontamination_Size(\d)_Class(\d)$/i,
    Disruptor: {
        r: /^Hpt_PulseLaser_([^_]+)_([^_]+)_Disruptor$/i,
        groups: [2, 1],
    },
    DockingComputer: /^Int_DockingComputer_Standard$/i,
    DumbfireRack: /^Hpt_DumbfireMissileRack_Fixed_([^_]+)$/i,
    ECM: /^Hpt_ElectronicCountermeasure_Tiny$/i,
    Enforcer: {
        r: /^Hpt_MultiCannon_([^_]+)_([^_]+)_Strong$/i,
        groups: [2, 1],
    },
    EnzymeMissileRack: {
        r: /^Hpt_CausticMissile_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    FlakLauncher: {
        r: /^Hpt_FlakMortar_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    FlechetteLauncher: {
        r: /^Hpt_FlechetteLauncher_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    FragCannon: {
        r: /^Hpt_SlugShot_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    FSDDisruptor: {
        r: /^Hpt_DumbfireMissileRack_([^_]+)_([^_]+)_Lasso$/i,
        groups: [2, 1],
    },
    FSDInterdictor: /^Int_FSDInterdictor_Size(\d)_Class(\d)$/i,
    FSDBooster: /^Int_GuardianFSDBooster_Size(\d)$/i,
    FuelScoop: /^Int_FuelScoop_Size(\d)_Class(\d)$/i,
    FuelTransferLimpet: /^Int_DroneControl_FuelTransfer_Size(\d)_Class(\d)$/i,
    FighterBay: /^Int_FighterBay_Size(\d)_Class1$/i,
    GuardianGaussCannon: {
        r: /^Hpt_Guardian_GaussCannon_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    GuardianHRP: /^Int_GuardianHullReinforcement_Size(\d)_Class(\d)$/i,
    GuardianMRP: /^Int_GuardianModuleReinforcement_Size(\d)_Class(\d)$/i,
    GuardianPlasmaCharger: {
        r: /^Hpt_Guardian_PlasmaLauncher_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    GuardianShardCannon: {
        r: /^Hpt_Guardian_ShardCannon_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    GuardianSRP: /^Int_GuardianShieldReinforcement_Size(\d)_Class(\d)$/i,
    HatchBreakerLimpet: /^Int_DroneControl_ResourceSiphon_Size(\d)_Class(\d)$/i,
    HeatSinkLauncher: /^Hpt_HeatSinkLauncher_Turret_Tiny$/i,
    HRP: /^Int_HullReinforcement_Size(\d)_Class(\d)$/i,
    ImperialHammer: {
        r: /^Hpt_Railgun_([^_]+)_([^_]+)_Burst$/i,
        groups: [2, 1],
    },
    KillWarrantScanner: {
        r: /^Hpt_CrimeScanner_Size0_Class(\d)$/i,
        groups: [-1, 1],
    },
    ManifestScanner: {
        r: /^Hpt_CargoScanner_Size0_Class(\d)$/i,
        groups: [-1, 1],
    },
    MultiCannon: {
        r: /^Hpt_MultiCannon_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    MineLauncher: /^Hpt_MineLauncher_Fixed_([^_]+)$/i,
    MiningLance: {
        r: /^Hpt_MiningLaser_([^_]+)_([^_]+)_Advanced$/i,
        groups: [2, 1],
    },
    MiningLaser: {
        r: /^Hpt_MiningLaser_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    MRP: /^Int_ModuleReinforcement_Size(\d)_Class(\d)$/i,
    MetaAlloyHRP: /^Int_MetaAlloyHullReinforcement_Size(\d)_Class(\d)$/i,
    PackHound: {
        r: /^Hpt_DrunkMissileRack_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    Pacifier: {
        r: /^Hpt_Slugshot_([^_]+)_([^_]+)_Range$/i,
        groups: [2, 1],
    },
    PlasmaAcc: {
        r: /^Hpt_PlasmaAccelerator_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    PointDefence: /^Hpt_PlasmaPointDefence_Turret_Tiny$/i,
    PrismaticShieldGen: /^Int_ShieldGenerator_Size(\d)_Class(\d)_Strong$/i,
    ProspectorLimpet: /^Int_DroneControl_Prospector_Size(\d)_Class(\d)$/i,
    PulseLaser: {
        r: /^Hpt_PulseLaser_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    PulseWaveAnalyzer: {
        r: /^Hpt_MRAScanner_Size0_Class(\d+)$/i,
        groups: [-1, 1],
    },
    RailGun: {
        r: /^Hpt_RailGun_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    ReconLimpet: /^Int_DroneControl_Recon_Size(\d)_Class(\d)$/i,
    Refinery: /^Int_Refinery_Size(\d)_Class(\d)$/i,
    RepairLimpet: /^Int_DroneControl_Repair_Size(\d)_Class(\d)$/i,
    ResearchLimpet: /^Int_DroneControl_UnkVesselResearch$/i,
    Retributor: {
        r: /^Hpt_BeamLaser_([^_]+)_([^_]+)_Heat$/i,
        groups: [2, 1],
    },
    SeismicChargeLauncher: /^Hpt_Mining_SeismChrgWarhd_([^_]+)_([^_]+)$/i,
    ShieldBooster: {
        r: /^Hpt_ShieldBooster_Size0_Class(\d)$/i,
        groups: [-1, 1],
    },
    ShieldGen: /^Int_ShieldGenerator_Size(\d)_Class(\d)$/i,
    SubsurfaceDisplacementMissile: /^Hpt_Mining_SubSurfDispMisle_([^_]+)_([^_]+)$/i,
    SCB: /^Int_ShieldCellBank_Size(\d)_Class(\d)$/i,
    SeekerRack: /^Hpt_BasicMissileRack_Fixed_([^_]+)$/i,
    ShockCannon: {
        r: /^Hpt_PlasmaShockCannon_([^_]+)_([^_]+)$/i,
        groups: [2, 1],
    },
    ShockMine: /Hpt_MineLauncher_Fixed_Small_Impulse$/i,
    ShutdownNeutralizer: /^Hpt_AntiUnknownShutdown_Tiny$/i,
    SupercruiseAssist: /^Int_SupercruiseAssist$/i,
    SurfaceScanner: /^Int_DetailedSurfaceScanner_Tiny$/i,
    TorpedoPylon: /^Hpt_AdvancedTorpPylon_Fixed_([^_]+)$/i,
    VehicleBay: /^Int_BuggyBay_Size(\d)_Class(\d)$/i,
    WakeScanner: {
        r: /^Hpt_CloudScanner_Size0_Class(\d)$/i,
        groups: [-1, 1],
    },
    XenoScanner: /^Hpt_XenoScanner_Basic_Tiny$/i,
};

module.exports.CAT_CORIOLIS_TO_FD = {
    'abl': ['AbrasionBlaster'],
    'am': ['AFM'],
    'bh': ['Armour'],
    'bl': ['BeamLaser', 'Retributor'],
    'bsg': ['BiWeaveShieldGen'],
    'c': ['Cannon'],
    'cc': ['CollectorLimpet'],
    'ch': ['ChaffLauncher'],
    'cr': ['CargoRack', 'CorrosionResistantCargoRack'],
    'rpl': ['RepairLimpet'],
    'cs': ['ManifestScanner'],
    'dc': ['DockingComputer', 'AdvancedDockingComputer'],
    'ec': ['ECM'],
    'fc': ['FragCannon', 'Pacifier'],
    'rfl': ['FlakLauncher'],
    'fh': ['FighterBay'],
    'fi': ['FSDInterdictor'],
    'fs': ['FuelScoop'],
    'fsd': ['FSD'],
    'ft': ['FuelTank'],
    'fx': ['FuelTransferLimpet'],
    'hb': ['HatchBreakerLimpet'],
    'hr': ['HRP'],
    'hs': ['HeatSinkLauncher'],
    'kw': ['KillWarrantScanner'],
    'ls': ['LifeSupport'],
    'mc': ['MultiCannon', 'Enforcer'],
    'axmc': ['AXMultiCannon'],
    'ml': ['MiningLaser', 'Mining Lance'],
    'mr': ['DumbfireRack', 'SeekerRack', 'PackHound'],
    'axmr': ['AXDumbfireRack'],
    'mrp': ['MRP'],
    'nl': ['MineLauncher', 'ShockMine'],
    'gpc': ['GuardianPlasmaCharger'],
    'gsrp': ['GuardianSRP'],
    'gfsb': ['FSDBooster'],
    'ghrp': ['GuardianHRP'],
    'gmrp': ['GuardianMRP'],
    'tbsc': ['ShockCannon'],
    'gsc': ['GuardianShardCannon'],
    'gpd': ['GuardianPowerDistributor'],
    'gpp': ['GuardianPowerplant'],
    'ggc': ['GuardianGaussCannon'],
    'pa': ['PlasmaAcc', 'AdvancedPlasmaAcc'],
    'pc': ['ProspectorLimpet'],
    'pce': ['PassengerCabins'],
    'pci': ['PassengerCabins'],
    'pcm': ['PassengerCabins'],
    'pcq': ['PassengerCabins'],
    'pd': ['PowerDistributor'],
    'pl': ['PulseLaser', 'Disruptor'],
    'po': ['PointDefence'],
    'pp': ['Powerplant'],
    'pv': ['VehicleBay'],
    'pwa': ['PulseWaveAnalyzer'],
    'rf': ['Refinery'],
    'rg': ['RailGun', 'ImperialHammer'],
    's': ['Sensors'],
    'sb': ['ShieldBooster'],
    'sdm': ['SubsurfaceDisplacementMissile'],
    'sfn': ['ShutdownNeutralizer'],
    'scb': ['SCB'],
    'scl': ['SeismicChargeLauncher'],
    'sg': ['ShieldGen', 'PrismaticShieldGen'],
    'sua': ['SupercruiseAssist'],
    'ss': ['SurfaceScanner'],
    'xs': ['XenoScanner'],
    't': ['Thrusters', 'EnhancedThrusters'],
    'tp': ['TorpedoPylon'],
    'ul': ['BurstLaser', 'CytoScrambler'],
    'ws': ['WakeScanner'],
    'tbem': ['EnzymeMissileRack'],
    'tbrfl': ['FlechetteLauncher'],
    'dtl': ['DecontaminationLimpet'],
    'mahr': ['MetaAlloyHRP'],
};

module.exports.TYPE_TO_GROUP = {
    'abrasionblaster': 'mining',
    'advancedplasmaacc': 'plasmaacc',
    'guardianpowerplant': 'powerplant',
    'enhancedthrusters': 'thrusters',
    'guardianpowerdistributor': 'powerdistributor',
    'axdumbfirerack': 'experimental',
    'axmulticannon': 'experimental',
    'biweaveshieldgen': 'shieldgen',
    'cytoscrambler': 'burstlaser',
    'corrosionresistantcargorack': 'cargorack',
    'advanceddockingcomputer': 'dockingcomputer',
    'dumbfirerack': 'missilerack',
    'enforcer': 'multicannon',
    'enzymemissilerack': 'missilerack',
    'fsddisruptor': 'missilerack',
    'flaklauncher': 'experimental',
    'flechettelauncher': 'experimental',
    'guardiangausscannon': 'experimental',
    'guardianhrp': 'hrp',
    'guardianmrp': 'mrp',
    'guardianplasmacharger': 'experimental',
    'guardianshardcannon': 'experimental',
    'guardiansrp': 'hrp',
    'imperialhammer': 'railgun',
    'mininglance': 'mining',
    'mininglaser': 'mining',
    'metaalloyhrp': 'hrp',
    'packhound': 'missilerack',
    'pacifier': 'fragcannon',
    'prismaticshieldgen': 'shieldgen',
    'disruptor': 'pulselaser',
    'retributor': 'beamlaser',
    'seismicchargelauncher': 'mining',
    'subsurfacedisplacementmissile': 'mining',
    'seekerrack': 'missilerack',
    'shockcannon': 'experimental',
    'shockmine': 'minelauncher',
    'xenoscanner': 'experimental',
};

/**
 * There are some blueprints that are "duplicated" in coriolis because fdev
 * implemented different features for different classes of modules. We describe
 * the classes of modules specific features apply only to here.
 */
module.exports.BLUEPRINT_EXCEPTION_TARGETS = {
    'sensor_longrange': '^int_sensors',
    'sensor_wideangle': '^int_sensors',
    'sensor_longrange_scanner': '^hpt_(cargo|cloud|crime)scanner',
    'sensor_wideangle_scanner': '^hpt_(cargo|cloud|crime)scanner',
    'mc_overcharged': '^hpt_multicannon',
};

/**
 * Same as BLUEPRINT_EXCEPTION_TARGETS but for experimental effects.
 */
module.exports.EXPERIMENTAL_EXCEPTION_TARGETS = {
    'special_plasma_slug_cooled': '^hpt_railgun',
};
