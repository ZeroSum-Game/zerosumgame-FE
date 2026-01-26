import { useState } from 'react';
   import useGameStore, { StockSymbol } from '../../store/useGameStore';
   import { apiBuyAsset } from '../../services/api';

   const ASSETS: { key: StockSymbol; name: string }[] = [
     { key: 'SAMSUNG', name: '삼성전자' },
     { key: 'TESLA', name: '테슬라' },
     { key: 'LOCKHEED', name: '록히드마틴' },
     { key: 'BITCOIN', name: '비트코인' },
     { key: 'GOLD', name: '금' },
   ];

   const BuyAssetModal = () => {
     const closeModal = useGameStore((s) => s.closeModal);
     const assetPrices = useGameStore((s) => s.assetPrices);
     const [selectedAsset, setSelectedAsset] = useState<StockSymbol>('SAMSUNG');
     const [quantity, setQuantity] = useState(1);

     const currentPrice = assetPrices[selectedAsset] || 0;
     const totalPrice = currentPrice * quantity;

     const handleBuy = async () => {
       try {
         await apiBuyAsset(selectedAsset.toLowerCase(), quantity);
         alert('매수 성공!');
         closeModal();
       } catch (e: any) {
         alert(e.message || '매수 실패');
       }
     };

     return (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
         <div className="w-full max-w-md rounded-2xl bg-slate-800 p-6 text-white shadow-2xl border border-white/10">
           <h2 className="mb-6 text-2xl font-bold text-center">📈 자산 매수</h2>
           <div className="flex gap-2 overflow-x-auto mb-6 pb-2 no-scrollbar">
             {ASSETS.map((asset) => (
               <button
                 key={asset.key}
                 onClick={() => setSelectedAsset(asset.key)}
                 className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                   selectedAsset === asset.key 
                     ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105' 
                     : 'bg-white/5 text-white/50 hover:bg-white/10'
                 }`}
               >
                 {asset.name}
               </button>
             ))}
           </div>
           <div className="space-y-4 bg-black/20 p-5 rounded-2xl border border-white/5">
             <div className="flex justify-between items-center">
               <span className="text-white/60">현재 시세</span>
               <span className="text-xl font-bold">{currentPrice.toLocaleString()} 원</span>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-white/60">매수 수량</span>
               <div className="flex items-center gap-3 bg-white/5 rounded-lg p-1">
                 <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">-</button>
                 <span className="font-mono text-xl w-12 text-center font-bold">{quantity}</span>
                 <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">+</button>
               </div>
             </div>
             <div className="h-px bg-white/10 my-2" />
             <div className="flex justify-between items-end text-blue-300">
               <span className="font-bold text-sm mb-1">총 결제 금액</span>
               <span className="text-3xl font-black text-white">{totalPrice.toLocaleString()} 원</span>
             </div>
           </div>
           <div className="mt-8 flex gap-3">
             <button onClick={closeModal} className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition font-bold text-white/70">취소</button>
             <button onClick={handleBuy} className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition font-bold text-white shadow-lg shadow-blue-900/30">매수하기</button>
           </div>
         </div>
       </div>
     );
   };
   export default BuyAssetModal;
