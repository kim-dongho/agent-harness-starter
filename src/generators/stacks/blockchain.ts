/**
 * @fileoverview 블록체인 스택 보일러플레이트 생성기
 *
 * Solidity(Hardhat/Foundry), Solana(Anchor), Move(Sui/Aptos),
 * TON(Tact), CosmWasm 프로젝트의 기본 구조를 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';

/**
 * Solidity Hardhat 프로젝트 보일러플레이트를 생성한다.
 *
 * contracts/, scripts/, test/ 디렉토리와 hardhat.config.ts, 예제 컨트랙트를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupSolidityHardhat(dir: string): Promise<void> {
  await fs.ensureDir(path.join(dir, 'contracts'));
  await fs.ensureDir(path.join(dir, 'scripts'));
  await fs.ensureDir(path.join(dir, 'test'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir), version: '0.1.0',
    scripts: { compile: 'hardhat compile', test: 'hardhat test', deploy: 'hardhat run scripts/deploy.js', build: 'echo "No build step"', dev: 'echo "No dev step"' },
    devDependencies: { hardhat: '^2.22.0', '@nomicfoundation/hardhat-toolbox': '^5' },
  }, { spaces: 2 });

  await fs.writeFile(path.join(dir, 'hardhat.config.js'), `require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = { solidity: "0.8.24" };
`);

  await fs.writeFile(path.join(dir, 'scripts/deploy.js'), `const { ethers } = require("hardhat");

async function main() {
  const Lock = await ethers.getContractFactory("Lock");
  const unlockTime = Math.floor(Date.now() / 1000) + 60;
  const lock = await Lock.deploy(unlockTime, { value: ethers.parseEther("0.001") });
  await lock.waitForDeployment();
  console.log("Lock deployed to:", await lock.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`);

  await fs.writeFile(path.join(dir, 'contracts/Lock.sol'), `// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract Lock {
    uint256 public unlockTime;
    address payable public owner;

    event Withdrawal(uint256 amount, uint256 when);

    constructor(uint256 _unlockTime) payable {
        require(block.timestamp < _unlockTime, "Unlock time should be in the future");
        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() external {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");
        emit Withdrawal(address(this).balance, block.timestamp);
        owner.transfer(address(this).balance);
    }
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\nartifacts\ncache\ntypechain-types\n.env\n');
}

/**
 * Solidity Foundry 프로젝트 보일러플레이트를 생성한다.
 *
 * src/, test/, script/ 디렉토리와 foundry.toml, 예제 컨트랙트를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupSolidityFoundry(dir: string): Promise<void> {
  await fs.ensureDir(path.join(dir, 'src'));
  await fs.ensureDir(path.join(dir, 'test'));
  await fs.ensureDir(path.join(dir, 'script'));
  await fs.ensureDir(path.join(dir, 'lib'));

  await fs.writeFile(path.join(dir, 'foundry.toml'), `[profile.default]\nsrc = "src"\nout = "out"\nlibs = ["lib"]\nsolc = "0.8.24"\n`);

  await fs.writeFile(path.join(dir, 'src/Counter.sol'), `// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract Counter {
    uint256 public number;

    function setNumber(uint256 newNumber) public { number = newNumber; }
    function increment() public { number++; }
}
`);

  await fs.writeFile(path.join(dir, 'test/Counter.t.sol'), `// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;

    function setUp() public { counter = new Counter(); counter.setNumber(0); }
    function test_Increment() public { counter.increment(); assertEq(counter.number(), 1); }
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'out/\ncache/\n.env\n');
}

/**
 * Solana Anchor 프로젝트 보일러플레이트를 생성한다.
 *
 * programs/, tests/ 디렉토리와 Anchor.toml, Cargo.toml, 예제 프로그램을 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupSolanaAnchor(dir: string): Promise<void> {
  const name = path.basename(dir).replace(/-/g, '_');

  await fs.ensureDir(path.join(dir, `programs/${name}/src`));
  await fs.ensureDir(path.join(dir, 'tests'));
  await fs.ensureDir(path.join(dir, 'app'));

  await fs.writeFile(path.join(dir, 'Anchor.toml'), `[features]\nseeds = false\nskip-lint = false\n\n[programs.localnet]\n${name} = "${name}"\n\n[provider]\ncluster = "Localnet"\nwallet = "~/.config/solana/id.json"\n`);

  await fs.writeFile(path.join(dir, `programs/${name}/src/lib.rs`), `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod ${name} {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
`);

  await fs.writeFile(path.join(dir, `programs/${name}/Cargo.toml`), `[package]\nname = "${name}"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.30.1"\n`);
  await fs.writeFile(path.join(dir, 'Cargo.toml'), `[workspace]\nmembers = ["programs/*"]\nresolver = "2"\n`);
  await fs.writeFile(path.join(dir, '.gitignore'), 'target/\nnode_modules/\ntest-ledger/\n.anchor/\n.env\n');
}

/**
 * Move Sui 프로젝트 보일러플레이트를 생성한다.
 *
 * sources/, tests/ 디렉토리와 Move.toml, 예제 모듈을 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupMoveSui(dir: string): Promise<void> {
  const name = path.basename(dir).replace(/-/g, '_');
  await fs.ensureDir(path.join(dir, 'sources'));
  await fs.ensureDir(path.join(dir, 'tests'));

  await fs.writeFile(path.join(dir, 'Move.toml'), `[package]\nname = "${name}"\nedition = "2024.beta"\n\n[dependencies]\nSui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }\n\n[addresses]\n${name} = "0x0"\n`);

  await fs.writeFile(path.join(dir, `sources/${name}.move`), `module ${name}::${name} {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct Counter has key { id: UID, value: u64 }

    public entry fun create(ctx: &mut TxContext) {
        transfer::share_object(Counter { id: object::new(ctx), value: 0 });
    }

    public entry fun increment(counter: &mut Counter) { counter.value = counter.value + 1; }
    public fun value(counter: &Counter): u64 { counter.value }
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'build/\n');
}

/**
 * Move Aptos 프로젝트 보일러플레이트를 생성한다.
 *
 * sources/, tests/ 디렉토리와 Move.toml, 예제 모듈을 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupMoveAptos(dir: string): Promise<void> {
  const name = path.basename(dir).replace(/-/g, '_');
  await fs.ensureDir(path.join(dir, 'sources'));
  await fs.ensureDir(path.join(dir, 'tests'));

  await fs.writeFile(path.join(dir, 'Move.toml'), `[package]\nname = "${name}"\nversion = "0.1.0"\n\n[addresses]\n${name} = "_"\n\n[dependencies]\nAptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-framework", rev = "main" }\n`);

  await fs.writeFile(path.join(dir, `sources/${name}.move`), `module ${name}::counter {
    use std::signer;

    struct Counter has key { value: u64 }

    public entry fun initialize(account: &signer) { move_to(account, Counter { value: 0 }); }

    public entry fun increment(account: &signer) acquires Counter {
        let counter = borrow_global_mut<Counter>(signer::address_of(account));
        counter.value = counter.value + 1;
    }

    #[view]
    public fun get_count(addr: address): u64 acquires Counter { borrow_global<Counter>(addr).value }
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'build/\n');
}

/**
 * TON Tact 프로젝트 보일러플레이트를 생성한다.
 *
 * contracts/, tests/, scripts/ 디렉토리와 tact.config.json, 예제 컨트랙트를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupTonTact(dir: string): Promise<void> {
  await fs.ensureDir(path.join(dir, 'contracts'));
  await fs.ensureDir(path.join(dir, 'tests'));
  await fs.ensureDir(path.join(dir, 'scripts'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir), version: '0.1.0',
    scripts: { build: 'tact --config tact.config.json', test: 'jest', deploy: 'ts-node scripts/deploy.ts' },
    devDependencies: { '@tact-lang/compiler': '^1', '@tact-lang/emulator': '^4', '@ton/core': '^0.56', '@ton/crypto': '^3', jest: '^29', 'ts-jest': '^29', typescript: '^5' },
  }, { spaces: 2 });

  await fs.writeFile(path.join(dir, 'contracts/counter.tact'), `import "@stdlib/deploy";

contract Counter with Deployable {
    val: Int as uint32;
    init() { self.val = 0; }
    receive("increment") { self.val = self.val + 1; }
    get fun value(): Int { return self.val; }
}
`);

  await fs.writeFile(path.join(dir, 'tact.config.json'), `{\n  "projects": [{ "name": "counter", "path": "./contracts/counter.tact", "output": "./build" }]\n}\n`);
  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\nbuild\n.env\n');
}

/**
 * CosmWasm(Rust) 프로젝트 보일러플레이트를 생성한다.
 *
 * src/ 디렉토리와 Cargo.toml, contract/msg/state/error 모듈을 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupCosmWasm(dir: string): Promise<void> {
  const name = path.basename(dir).replace(/-/g, '_');
  await fs.ensureDir(path.join(dir, 'src'));

  await fs.writeFile(path.join(dir, 'Cargo.toml'), `[package]\nname = "${name}"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "rlib"]\n\n[dependencies]\ncosmwasm-std = "2.1"\ncosmwasm-schema = "2.1"\ncw-storage-plus = "2.0"\ncw2 = "2.0"\nschemars = "0.8"\nserde = { version = "1", default-features = false, features = ["derive"] }\nthiserror = "1"\n\n[dev-dependencies]\ncw-multi-test = "2.1"\n`);

  await fs.writeFile(path.join(dir, 'src/lib.rs'), 'pub mod contract;\npub mod error;\npub mod msg;\npub mod state;\n');

  await fs.writeFile(path.join(dir, 'src/msg.rs'), `use cosmwasm_schema::{cw_serde, QueryResponses};

#[cw_serde]
pub struct InstantiateMsg { pub count: i32 }

#[cw_serde]
pub enum ExecuteMsg { Increment {}, Reset { count: i32 } }

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg { #[returns(CountResponse)] GetCount {} }

#[cw_serde]
pub struct CountResponse { pub count: i32 }
`);

  await fs.writeFile(path.join(dir, 'src/state.rs'), 'use cw_storage_plus::Item;\n\npub const COUNT: Item<i32> = Item::new("count");\n');

  await fs.writeFile(path.join(dir, 'src/error.rs'), `use cosmwasm_std::StdError;\nuse thiserror::Error;\n\n#[derive(Error, Debug)]\npub enum ContractError {\n    #[error("{0}")]\n    Std(#[from] StdError),\n    #[error("Unauthorized")]\n    Unauthorized {},\n}\n`);

  await fs.writeFile(path.join(dir, 'src/contract.rs'), `use cosmwasm_std::{to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult};
use crate::error::ContractError;
use crate::msg::{CountResponse, ExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::COUNT;

pub fn instantiate(deps: DepsMut, _env: Env, _info: MessageInfo, msg: InstantiateMsg) -> Result<Response, ContractError> {
    COUNT.save(deps.storage, &msg.count)?;
    Ok(Response::new().add_attribute("method", "instantiate"))
}

pub fn execute(deps: DepsMut, _env: Env, _info: MessageInfo, msg: ExecuteMsg) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Increment {} => {
            COUNT.update(deps.storage, |count| -> StdResult<_> { Ok(count + 1) })?;
            Ok(Response::new().add_attribute("action", "increment"))
        }
        ExecuteMsg::Reset { count } => {
            COUNT.save(deps.storage, &count)?;
            Ok(Response::new().add_attribute("action", "reset"))
        }
    }
}

pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCount {} => {
            let count = COUNT.load(deps.storage)?;
            to_json_binary(&CountResponse { count })
        }
    }
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'target/\n.env\n');
}
