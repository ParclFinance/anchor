import { TransactionSignature } from "@solana/web3.js";
import Provider from "../../provider";
import { Idl, IdlInstruction } from "../../idl";
import { splitArgsAndCtx } from "../context";
import { TransactionFn } from "./transaction";
import { ProgramError } from "../../error";
import { InstructionContextFn, MakeInstructionsNamespace } from "./types";

export default class RpcFactory {
  public static build<IDL extends Idl, I extends IDL["instructions"][number]>(
    idlIx: I,
    txFn: TransactionFn<IDL, I>,
    idlErrors: Map<number, string>,
    provider: Provider
  ): RpcFn {
    const rpc: RpcFn<IDL, I> = async (...args) => {
      const tx = txFn(...args);
      const [, ctx] = splitArgsAndCtx(idlIx, [...args]);
      try {
        const txSig = await provider.send(tx, ctx.signers, ctx.options);
        return txSig;
      } catch (err) {
        console.log("Translating error", err);
        let translatedErr = ProgramError.parse(err, idlErrors);
        if (translatedErr === null) {
          throw err;
        }
        throw translatedErr;
      }
    };

    return rpc;
  }
}

/**
 * The namespace provides async methods to send signed transactions for each
 * *non*-state method on Anchor program.
 *
 * Keys are method names, values are RPC functions returning a
 * [[TransactionInstruction]].
 *
 * ## Usage
 *
 * ```javascript
 * rpc.<method>(...args, ctx);
 * ```
 *
 * ## Parameters
 *
 * 1. `args` - The positional arguments for the program. The type and number
 *    of these arguments depend on the program being used.
 * 2. `ctx`  - [[Context]] non-argument parameters to pass to the method.
 *    Always the last parameter in the method call.
 * ```
 *
 * ## Example
 *
 * To send a transaction invoking the `increment` method above,
 *
 * ```javascript
 * const txSignature = await program.rpc.increment({
 *   accounts: {
 *     counter,
 *     authority,
 *   },
 * });
 * ```
 */
export type RpcNamespace<IDL extends Idl = Idl> = MakeInstructionsNamespace<
  IDL,
  IDL["instructions"][number],
  Promise<TransactionSignature>
>;

/**
 * RpcFn is a single RPC method generated from an IDL, sending a transaction
 * paid for and signed by the configured provider.
 */
export type RpcFn<
  IDL extends Idl = Idl,
  I extends IDL["instructions"][number] = IDL["instructions"][number]
> = InstructionContextFn<IDL, I, Promise<TransactionSignature>>;